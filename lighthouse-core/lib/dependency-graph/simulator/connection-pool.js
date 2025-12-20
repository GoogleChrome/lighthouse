/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkAnalyzer = require('./network-analyzer.js');
const TcpConnection = require('./tcp-connection.js');

const DEFAULT_SERVER_RESPONSE_TIME = 30;
const TLS_SCHEMES = ['https', 'wss'];

// Each origin can have 6 simulatenous connections open
// https://cs.chromium.org/chromium/src/net/socket/client_socket_pool_manager.cc?type=cs&q="int+g_max_sockets_per_group"
const CONNECTIONS_PER_ORIGIN = 6;

module.exports = class ConnectionPool {
  /**
   * @param {LH.Artifacts.NetworkRequest[]} records
   * @param {Required<LH.Gatherer.Simulation.Options>} options
   */
  constructor(records, options) {
    this._options = options;

    this._records = records;
    /** @type {Map<string, TcpConnection[]>} */
    this._connectionsByOrigin = new Map();
    /** @type {Map<LH.Artifacts.NetworkRequest, TcpConnection>} */
    this._connectionsByRecord = new Map();
    this._connectionsInUse = new Set();
    this._connectionReusedByRequestId = NetworkAnalyzer.estimateIfConnectionWasReused(records, {
      forceCoarseEstimates: true,
    });

    this._initializeConnections();
  }

  /**
   * @return {TcpConnection[]}
   */
  connectionsInUse() {
    return Array.from(this._connectionsInUse);
  }

  _initializeConnections() {
    const connectionReused = this._connectionReusedByRequestId;
    const additionalRttByOrigin = this._options.additionalRttByOrigin;
    const serverResponseTimeByOrigin = this._options.serverResponseTimeByOrigin;

    const recordsByOrigin = NetworkAnalyzer.groupByOrigin(this._records);
    for (const [origin, records] of recordsByOrigin.entries()) {
      const connections = [];
      const additionalRtt = additionalRttByOrigin.get(origin) || 0;
      const responseTime = serverResponseTimeByOrigin.get(origin) || DEFAULT_SERVER_RESPONSE_TIME;

      for (const record of records) {
        if (connectionReused.get(record.requestId)) continue;

        const isTLS = TLS_SCHEMES.includes(record.parsedURL.scheme);
        const isH2 = record.protocol === 'h2';
        const connection = new TcpConnection(
          this._options.rtt + additionalRtt,
          this._options.throughput,
          responseTime,
          isTLS,
          isH2
        );

        connections.push(connection);
      }

      if (!connections.length) {
        throw new Error(`Could not find a connection for origin: ${origin}`);
      }

      // Make sure each origin has minimum number of connections available for max throughput
      while (connections.length < CONNECTIONS_PER_ORIGIN) connections.push(connections[0].clone());

      this._connectionsByOrigin.set(origin, connections);
    }
  }

  /**
   * @param {Array<TcpConnection>} connections
   * @param {{ignoreConnectionReused?: boolean, observedConnectionWasReused: boolean}} options
   */
  _findAvailableConnectionWithLargestCongestionWindow(connections, options) {
    const {ignoreConnectionReused, observedConnectionWasReused} = options;

    /** @type {TcpConnection|null} */
    let maxConnection = null;
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];

      // Normally, we want to make sure the connection warmth matches the state of the record
      // we're acquiring for. Do this check first since it's the common case and cheaper than our
      // "in use" check below.
      // Use the _warmed property instead of the getter because this is a surprisingly hot code path.
      if (!ignoreConnectionReused && connection._warmed !== observedConnectionWasReused) {
        continue;
      }

      // Connections that are in use are never available.
      if (this._connectionsInUse.has(connection)) {
        continue;
      }

      // This connection is a match and is available! Update our max if it has a larger congestionWindow
      const currentMax = (maxConnection && maxConnection.congestionWindow) || -Infinity;
      if (connection.congestionWindow > currentMax) maxConnection = connection;
    }

    return maxConnection;
  }

  /**
   * This method finds an available connection to the origin specified by the network record or null
   * if no connection was available. If returned, connection will not be available for other network
   * records until release is called.
   *
   * If ignoreConnectionReused is true, acquire will consider all connections not in use as available.
   * Otherwise, only connections that have matching "warmth" are considered available.
   *
   * @param {LH.Artifacts.NetworkRequest} record
   * @param {{ignoreConnectionReused?: boolean}} options
   * @return {?TcpConnection}
   */
  acquire(record, options = {}) {
    if (this._connectionsByRecord.has(record)) throw new Error('Record already has a connection');

    const origin = record.parsedURL.securityOrigin;
    const observedConnectionWasReused = !!this._connectionReusedByRequestId.get(record.requestId);
    const connections = this._connectionsByOrigin.get(origin) || [];
    const connectionToUse = this._findAvailableConnectionWithLargestCongestionWindow(connections, {
      ignoreConnectionReused: options.ignoreConnectionReused,
      observedConnectionWasReused,
    });

    if (!connectionToUse) return null;

    this._connectionsInUse.add(connectionToUse);
    this._connectionsByRecord.set(record, connectionToUse);
    return connectionToUse;
  }

  /**
   * Return the connection currently being used to fetch a record. If no connection
   * currently being used for this record, an error will be thrown.
   *
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {TcpConnection}
   */
  acquireActiveConnectionFromRecord(record) {
    const activeConnection = this._connectionsByRecord.get(record);
    if (!activeConnection) throw new Error('Could not find an active connection for record');

    return activeConnection;
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} record
   */
  release(record) {
    const connection = this._connectionsByRecord.get(record);
    this._connectionsByRecord.delete(record);
    this._connectionsInUse.delete(connection);
  }
};
