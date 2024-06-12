/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';
import {NetworkAnalyzer} from './NetworkAnalyzer.js';
import {TcpConnection} from './TcpConnection.js';

const DEFAULT_SERVER_RESPONSE_TIME = 30;
const TLS_SCHEMES = ['https', 'wss'];

// Each origin can have 6 simulatenous connections open
// https://cs.chromium.org/chromium/src/net/socket/client_socket_pool_manager.cc?type=cs&q="int+g_max_sockets_per_group"
const CONNECTIONS_PER_ORIGIN = 6;

export class ConnectionPool {
  /**
   * @param {Lantern.NetworkRequest[]} records
   * @param {Required<Lantern.Simulation.Options>} options
   */
  constructor(records, options) {
    this._options = options;

    this._records = records;
    /** @type {Map<string, TcpConnection[]>} */
    this._connectionsByOrigin = new Map();
    /** @type {Map<Lantern.NetworkRequest, TcpConnection>} */
    this._connectionsByRequest = new Map();
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
    for (const [origin, requests] of recordsByOrigin.entries()) {
      const connections = [];
      const additionalRtt = additionalRttByOrigin.get(origin) || 0;
      const responseTime = serverResponseTimeByOrigin.get(origin) || DEFAULT_SERVER_RESPONSE_TIME;

      for (const request of requests) {
        if (connectionReused.get(request.requestId)) continue;

        const isTLS = TLS_SCHEMES.includes(request.parsedURL.scheme);
        const isH2 = request.protocol === 'h2';
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

      // Make sure each origin has minimum number of connections available for max throughput.
      // But only if it's not over H2 which maximizes throughput already.
      const minConnections = connections[0].isH2() ? 1 : CONNECTIONS_PER_ORIGIN;
      while (connections.length < minConnections) connections.push(connections[0].clone());

      this._connectionsByOrigin.set(origin, connections);
    }
  }

  /**
   * @param {Array<TcpConnection>} connections
   */
  _findAvailableConnectionWithLargestCongestionWindow(connections) {
    /** @type {TcpConnection|null} */
    let maxConnection = null;
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];

      // Connections that are in use are never available.
      if (this._connectionsInUse.has(connection)) {
        continue;
      }

      // This connection is a match and is available! Update our max if it has a larger congestionWindow
      const currentMax = (maxConnection?.congestionWindow) || -Infinity;
      if (connection.congestionWindow > currentMax) maxConnection = connection;
    }

    return maxConnection;
  }

  /**
   * This method finds an available connection to the origin specified by the network request or null
   * if no connection was available. If returned, connection will not be available for other network
   * records until release is called.
   *
   * @param {Lantern.NetworkRequest} request
   * @return {?TcpConnection}
   */
  acquire(request) {
    if (this._connectionsByRequest.has(request)) throw new Error('Record already has a connection');

    const origin = request.parsedURL.securityOrigin;
    const connections = this._connectionsByOrigin.get(origin) || [];
    const connectionToUse = this._findAvailableConnectionWithLargestCongestionWindow(connections);

    if (!connectionToUse) return null;

    this._connectionsInUse.add(connectionToUse);
    this._connectionsByRequest.set(request, connectionToUse);
    return connectionToUse;
  }

  /**
   * Return the connection currently being used to fetch a request. If no connection
   * currently being used for this request, an error will be thrown.
   *
   * @param {Lantern.NetworkRequest} request
   * @return {TcpConnection}
   */
  acquireActiveConnectionFromRequest(request) {
    const activeConnection = this._connectionsByRequest.get(request);
    if (!activeConnection) throw new Error('Could not find an active connection for request');

    return activeConnection;
  }

  /**
   * @param {Lantern.NetworkRequest} request
   */
  release(request) {
    const connection = this._connectionsByRequest.get(request);
    this._connectionsByRequest.delete(request);
    this._connectionsInUse.delete(connection);
  }
}
