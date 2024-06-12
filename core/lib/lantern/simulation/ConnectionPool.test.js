/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import {URL} from 'url';

import * as Lantern from '../lantern.js';

const {ConnectionPool} = Lantern.Simulation;

describe('ConnectionPool', () => {
  const rtt = 100;
  const throughput = 10000 * 1024;
  let requestId;

  function request(data = {}) {
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
      const pool = new ConnectionPool([request()], simulationOptions({rtt, throughput}));
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
      const recordA = request({url: 'https://example.com'});
      const pool = new ConnectionPool([recordA], simulationOptions({rtt, throughput}));
      const connection = pool._connectionsByOrigin.get('https://example.com')[0];
      assert.ok(connection._ssl, 'should have set connection TLS');
    });

    it('should set H2 properly', () => {
      const recordA = request({protocol: 'h2'});
      const pool = new ConnectionPool([recordA], simulationOptions({rtt, throughput}));
      const connection = pool._connectionsByOrigin.get('http://example.com')[0];
      assert.ok(connection.isH2(), 'should have set HTTP/2');
      assert.equal(pool._connectionsByOrigin.get('http://example.com').length, 1);
    });

    it('should set origin-specific RTT properly', () => {
      const additionalRttByOrigin = new Map([['http://example.com', 63]]);
      const pool = new ConnectionPool([request()],
          simulationOptions({rtt, throughput, additionalRttByOrigin}));
      const connection = pool._connectionsByOrigin.get('http://example.com')[0];
      assert.ok(connection._rtt, rtt + 63);
    });

    it('should set origin-specific server latency properly', () => {
      const serverResponseTimeByOrigin = new Map([['http://example.com', 63]]);
      const pool = new ConnectionPool([request()],
          simulationOptions({rtt, throughput, serverResponseTimeByOrigin}));
      const connection = pool._connectionsByOrigin.get('http://example.com')[0];
      assert.ok(connection._serverLatency, 63);
    });
  });

  describe('.acquire', () => {
    it('should remember the connection associated with each request', () => {
      const requestA = request();
      const requestB = request();
      const pool = new ConnectionPool([requestA, requestB], simulationOptions({rtt, throughput}));

      const connectionForA = pool.acquire(requestA);
      const connectionForB = pool.acquire(requestB);
      for (let i = 0; i < 10; i++) {
        assert.equal(pool.acquireActiveConnectionFromRequest(requestA), connectionForA);
        assert.equal(pool.acquireActiveConnectionFromRequest(requestB), connectionForB);
      }

      assert.deepStrictEqual(pool.connectionsInUse(), [connectionForA, connectionForB]);
    });

    it('should allocate at least 6 connections', () => {
      const pool = new ConnectionPool([request()], simulationOptions({rtt, throughput}));
      for (let i = 0; i < 6; i++) {
        assert.ok(pool.acquire(request()), `did not find connection for ${i}th request`);
      }
    });

    it('should allocate all connections', () => {
      const records = new Array(7).fill(undefined, 0, 7).map(() => request());
      const pool = new ConnectionPool(records, simulationOptions({rtt, throughput}));
      const connections = records.map(request => pool.acquire(request));
      assert.ok(connections[0], 'did not find connection for 1st request');
      assert.ok(connections[5], 'did not find connection for 6th request');
      assert.ok(connections[6], 'did not find connection for 7th request');
    });

    it('should be oblivious to connection reuse', () => {
      const coldRecord = request();
      const warmRecord = request();
      const pool = new ConnectionPool([coldRecord, warmRecord],
          simulationOptions({rtt, throughput}));
      pool._connectionReusedByRequestId.set(warmRecord.requestId, true);

      assert.ok(pool.acquire(coldRecord), 'should have acquired connection');
      assert.ok(pool.acquire(warmRecord), 'should have acquired connection');
      pool.release(coldRecord);

      for (const connection of pool._connectionsByOrigin.get('http://example.com')) {
        connection.setWarmed(true);
      }

      assert.ok(pool.acquire(coldRecord), 'should have acquired connection');
      assert.ok(pool.acquireActiveConnectionFromRequest(warmRecord),
        'should have acquired connection');
    });

    it('should acquire in order of warmness', () => {
      const recordA = request();
      const recordB = request();
      const recordC = request();
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
    it('noop for request without connection', () => {
      const requestA = request();
      const pool = new ConnectionPool([requestA], simulationOptions({rtt, throughput}));
      assert.equal(pool.release(requestA), undefined);
    });

    it('frees the connection for reissue', () => {
      const requests = new Array(6).fill(undefined, 0, 7).map(() => request());
      const pool = new ConnectionPool(requests, simulationOptions({rtt, throughput}));
      requests.push(request());

      requests.forEach(request => pool.acquire(request));

      assert.equal(pool.connectionsInUse().length, 6);
      assert.ok(!pool.acquire(requests[6]), 'had connection that is in use');

      pool.release(requests[0]);
      assert.equal(pool.connectionsInUse().length, 5);

      assert.ok(pool.acquire(requests[6]), 'could not reissue released connection');
      assert.ok(!pool.acquire(requests[0]), 'had connection that is in use');
    });
  });
});
