/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ConnectionPool = require('../../../../lib/dependency-graph/simulator/connection-pool.js');

const assert = require('assert').strict;
const URL = require('url').URL;

/* eslint-env jest */
describe('DependencyGraph/Simulator/ConnectionPool', () => {
  const rtt = 100;
  const throughput = 10000 * 1024;
  let requestId;

  function record(data = {}) {
    const url = data.url || 'http://example.com';
    const origin = new URL(url).origin;
    const scheme = url.split(':')[0];

    return Object.assign({
      requestId: requestId++,
      url,
      protocol: 'http/1.1',
      parsedURL: {scheme, securityOrigin: origin},
    }, data);
  }

  function simulationOptions(options) {
    return Object.assign(
      {
        rtt: 150,
        throughput: 1024,
        additionalRttByOrigin: new Map(),
        serverResponseTimeByOrigin: new Map(),
      },
      options
    );
  }

  beforeEach(() => {
    requestId = 1;
  });

  describe('#constructor', () => {
    it('should create the pool', () => {
      const pool = new ConnectionPool([record()], simulationOptions({rtt, throughput}));
      // Make sure 6 connections are created for each origin
      assert.equal(pool._connectionsByOrigin.get('http://example.com').length, 6);
      // Make sure it populates connectionWasReused
      assert.equal(pool._connectionReusedByRequestId.get(1), false);

      const connection = pool._connectionsByOrigin.get('http://example.com')[0];
      assert.equal(connection._rtt, rtt);
      assert.equal(connection._throughput, throughput);
      assert.equal(connection._serverLatency, 30); // sets to default value
    });

    it('should set TLS properly', () => {
      const recordA = record({url: 'https://example.com'});
      const pool = new ConnectionPool([recordA], simulationOptions({rtt, throughput}));
      const connection = pool._connectionsByOrigin.get('https://example.com')[0];
      assert.ok(connection._ssl, 'should have set connection TLS');
    });

    it('should set H2 properly', () => {
      const recordA = record({protocol: 'h2'});
      const pool = new ConnectionPool([recordA], simulationOptions({rtt, throughput}));
      const connection = pool._connectionsByOrigin.get('http://example.com')[0];
      assert.ok(connection.isH2(), 'should have set HTTP/2');
    });

    it('should set origin-specific RTT properly', () => {
      const additionalRttByOrigin = new Map([['http://example.com', 63]]);
      const pool = new ConnectionPool([record()],
          simulationOptions({rtt, throughput, additionalRttByOrigin}));
      const connection = pool._connectionsByOrigin.get('http://example.com')[0];
      assert.ok(connection._rtt, rtt + 63);
    });

    it('should set origin-specific server latency properly', () => {
      const serverResponseTimeByOrigin = new Map([['http://example.com', 63]]);
      const pool = new ConnectionPool([record()],
          simulationOptions({rtt, throughput, serverResponseTimeByOrigin}));
      const connection = pool._connectionsByOrigin.get('http://example.com')[0];
      assert.ok(connection._serverLatency, 63);
    });
  });

  describe('.acquire', () => {
    it('should remember the connection associated with each record', () => {
      const recordA = record();
      const recordB = record();
      const pool = new ConnectionPool([recordA, recordB], simulationOptions({rtt, throughput}));

      const connectionForA = pool.acquire(recordA);
      const connectionForB = pool.acquire(recordB);
      for (let i = 0; i < 10; i++) {
        assert.equal(pool.acquireActiveConnectionFromRecord(recordA), connectionForA);
        assert.equal(pool.acquireActiveConnectionFromRecord(recordB), connectionForB);
      }

      assert.deepStrictEqual(pool.connectionsInUse(), [connectionForA, connectionForB]);
    });

    it('should allocate at least 6 connections', () => {
      const pool = new ConnectionPool([record()], simulationOptions({rtt, throughput}));
      for (let i = 0; i < 6; i++) {
        assert.ok(pool.acquire(record()), `did not find connection for ${i}th record`);
      }
    });

    it('should allocate all connections', () => {
      const records = new Array(7).fill(undefined, 0, 7).map(() => record());
      const pool = new ConnectionPool(records, simulationOptions({rtt, throughput}));
      const connections = records.map(record => pool.acquire(record));
      assert.ok(connections[0], 'did not find connection for 1st record');
      assert.ok(connections[5], 'did not find connection for 6th record');
      assert.ok(connections[6], 'did not find connection for 7th record');
    });

    it('should respect observed connection reuse', () => {
      const coldRecord = record();
      const warmRecord = record();
      const pool = new ConnectionPool([coldRecord, warmRecord],
          simulationOptions({rtt, throughput}));
      pool._connectionReusedByRequestId.set(warmRecord.requestId, true);

      assert.ok(pool.acquire(coldRecord), 'should have acquired connection');
      assert.ok(!pool.acquire(warmRecord), 'should not have acquired connection');
      pool.release(coldRecord);

      const connections = Array.from(pool._connectionsByOrigin.get('http://example.com'));
      connections.forEach((connection, i) => {
        connection.setWarmed(i % 2 === 0);
      });

      assert.equal(pool.acquire(coldRecord), connections[1], 'should have cold connection');
      assert.equal(pool.acquire(warmRecord), connections[0], 'should have warm connection');
      pool.release(coldRecord);
      pool.release(warmRecord);

      connections.forEach(connection => {
        connection.setWarmed(true);
      });

      assert.ok(!pool.acquire(coldRecord), 'should not have acquired connection');
      assert.ok(pool.acquire(warmRecord), 'should have acquired connection');
    });

    it('should ignore observed connection reuse when flag is present', () => {
      const coldRecord = record();
      const warmRecord = record();
      const pool = new ConnectionPool([coldRecord, warmRecord],
          simulationOptions({rtt, throughput}));
      pool._connectionReusedByRequestId.set(warmRecord.requestId, true);

      const opts = {ignoreConnectionReused: true};
      assert.ok(pool.acquire(coldRecord, opts), 'should have acquired connection');
      assert.ok(pool.acquire(warmRecord, opts), 'should have acquired connection');
      pool.release(coldRecord);

      for (const connection of pool._connectionsByOrigin.get('http://example.com')) {
        connection.setWarmed(true);
      }

      assert.ok(pool.acquire(coldRecord, opts), 'should have acquired connection');
      assert.ok(pool.acquireActiveConnectionFromRecord(warmRecord, opts),
        'should have acquired connection');
    });

    it('should acquire in order of warmness', () => {
      const recordA = record();
      const recordB = record();
      const recordC = record();
      const pool = new ConnectionPool([recordA, recordB, recordC],
          simulationOptions({rtt, throughput}));
      pool._connectionReusedByRequestId.set(recordA.requestId, true);
      pool._connectionReusedByRequestId.set(recordB.requestId, true);
      pool._connectionReusedByRequestId.set(recordC.requestId, true);

      const [connectionWarm, connectionWarmer, connectionWarmest] =
        pool._connectionsByOrigin.get('http://example.com');
      connectionWarm.setWarmed(true);
      connectionWarm.setCongestionWindow(10);
      connectionWarmer.setWarmed(true);
      connectionWarmer.setCongestionWindow(100);
      connectionWarmest.setWarmed(true);
      connectionWarmest.setCongestionWindow(1000);

      assert.equal(pool.acquire(recordA), connectionWarmest);
      assert.equal(pool.acquire(recordB), connectionWarmer);
      assert.equal(pool.acquire(recordC), connectionWarm);
    });
  });

  describe('.release', () => {
    it('noop for record without connection', () => {
      const recordA = record();
      const pool = new ConnectionPool([recordA], simulationOptions({rtt, throughput}));
      assert.equal(pool.release(recordA), undefined);
    });

    it('frees the connection for reissue', () => {
      const records = new Array(6).fill(undefined, 0, 7).map(() => record());
      const pool = new ConnectionPool(records, simulationOptions({rtt, throughput}));
      records.push(record());

      records.forEach(record => pool.acquire(record));

      assert.equal(pool.connectionsInUse().length, 6);
      assert.ok(!pool.acquire(records[6]), 'had connection that is in use');

      pool.release(records[0]);
      assert.equal(pool.connectionsInUse().length, 5);

      assert.ok(pool.acquire(records[6]), 'could not reissue released connection');
      assert.ok(!pool.acquire(records[0]), 'had connection that is in use');
    });
  });
});
