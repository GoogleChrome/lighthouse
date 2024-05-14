/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {NetworkAnalyzer} from '../../../../lib/lantern/simulator/network-analyzer.js';
import {NetworkRecords} from '../../../../computed/network-records.js';
import {readJson} from '../../../test-utils.js';
import {NetworkRequest} from '../../../../lib/network-request.js';

const devtoolsLog = readJson('../../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const devtoolsLogWithRedirect = readJson('../../../fixtures/artifacts/redirect/devtoolslog.json', import.meta);

describe('DependencyGraph/Simulator/NetworkAnalyzer', () => {
  afterEach(() => {
    global.isLightrider = undefined;
  });

  let recordId;

  function createRecord(opts) {
    const url = opts.url || 'https://example.com';
    if (opts.networkRequestTime) opts.networkRequestTime *= 1000;
    if (opts.networkEndTime) opts.networkEndTime *= 1000;
    const record = Object.assign(
      {
        url,
        requestId: recordId++,
        connectionId: 0,
        connectionReused: false,
        networkRequestTime: 10,
        networkEndTime: 10,
        transferSize: 0,
        protocol: opts.protocol || 'http/1.1',
        parsedURL: {scheme: url.match(/https?/)[0], securityOrigin: url.match(/.*\.com/)[0]},
        timing: opts.timing || null,
      },
      opts
    );
    return NetworkRequest.asLanternNetworkRequest(record);
  }

  beforeEach(() => {
    recordId = 1;
  });

  function assertCloseEnough(valueA, valueB, threshold = 1) {
    const message = `${valueA} was not close enough to ${valueB}`;
    assert.ok(Math.abs(valueA - valueB) < threshold, message);
  }

  describe('#estimateIfConnectionWasReused', () => {
    it('should use built-in value when trustworthy', () => {
      const records = [
        {requestId: 1, connectionId: 1, connectionReused: false},
        {requestId: 2, connectionId: 1, connectionReused: true},
        {requestId: 3, connectionId: 2, connectionReused: false},
        {requestId: 4, connectionId: 3, connectionReused: false},
        {requestId: 5, connectionId: 2, connectionReused: true},
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, true], [3, false], [4, false], [5, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should estimate values when not trustworthy (duplicate IDs)', () => {
      const records = [
        createRecord({requestId: 1, networkRequestTime: 0, networkEndTime: 15}),
        createRecord({requestId: 2, networkRequestTime: 10, networkEndTime: 25}),
        createRecord({requestId: 3, networkRequestTime: 20, networkEndTime: 40}),
        createRecord({requestId: 4, networkRequestTime: 30, networkEndTime: 40}),
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, false], [3, true], [4, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should estimate values when not trustworthy (connectionReused nonsense)', () => {
      const records = [
        createRecord({
          requestId: 1,
          connectionId: 1,
          connectionReused: true,
          networkRequestTime: 0,
          networkEndTime: 15,
        }),
        createRecord({
          requestId: 2,
          connectionId: 1,
          connectionReused: true,
          networkRequestTime: 10,
          networkEndTime: 25,
        }),
        createRecord({
          requestId: 3,
          connectionId: 1,
          connectionReused: true,
          networkRequestTime: 20,
          networkEndTime: 40,
        }),
        createRecord({
          requestId: 4,
          connectionId: 2,
          connectionReused: false,
          networkRequestTime: 30,
          networkEndTime: 40,
        }),
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, false], [3, true], [4, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should estimate with earliest allowed reuse', () => {
      const records = [
        createRecord({requestId: 1, networkRequestTime: 0, networkEndTime: 40}),
        createRecord({requestId: 2, networkRequestTime: 10, networkEndTime: 15}),
        createRecord({requestId: 3, networkRequestTime: 20, networkEndTime: 30}),
        createRecord({requestId: 4, networkRequestTime: 35, networkEndTime: 40}),
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, false], [3, true], [4, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should work on a real devtoolsLog', () => {
      return NetworkRecords.request(devtoolsLog, {computedCache: new Map()}).then(records => {
        const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
        const distinctConnections = Array.from(result.values()).filter(item => !item).length;
        assert.equal(result.size, 66);
        assert.equal(distinctConnections, 3);
      });
    });
  });

  describe('#estimateRTTByOrigin', () => {
    it('should infer from tcp timing when available', () => {
      const timing = {connectStart: 0, connectEnd: 99};
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record]);
      const expected = {min: 99, max: 99, avg: 99, median: 99};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer only one estimate if tcp and ssl start times are equal', () => {
      const timing = {connectStart: 0, connectEnd: 99, sslStart: 0, sslEnd: 99};
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record]);
      const expected = {min: 99, max: 99, avg: 99, median: 99};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from tcp and ssl timing when available', () => {
      const timing = {connectStart: 0, connectEnd: 99, sslStart: 50, sslEnd: 99};
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record]);
      const expected = {min: 49, max: 50, avg: 49.5, median: 49.5};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from connection timing when available for h3 (one estimate)', () => {
      const timing = {connectStart: 0, connectEnd: 99, sslStart: 1, sslEnd: 99};
      const record =
        createRecord({networkRequestTime: 0, networkEndTime: 1, timing, protocol: 'h3'});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record]);
      const expected = {min: 99, max: 99, avg: 99, median: 99};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from sendStart when available', () => {
      const timing = {sendStart: 150};
      // this record took 150ms before Chrome could send the request
      // i.e. DNS (maybe) + queuing (maybe) + TCP handshake took ~100ms
      // 150ms / 3 round trips ~= 50ms RTT
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record], {coarseEstimateMultiplier: 1});
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from download timing when available', () => {
      const timing = {receiveHeadersEnd: 100};
      // this record took 1000ms after the first byte was received to download the payload
      // i.e. it took at least one full additional roundtrip after first byte to download the rest
      // 1000ms / 1 round trip ~= 1000ms RTT
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1.1,
        transferSize: 28 * 1024, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record], {
        coarseEstimateMultiplier: 1,
        useHeadersEndEstimates: false,
      });
      const expected = {min: 1000, max: 1000, avg: 1000, median: 1000};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from TTFB when available', () => {
      const timing = {receiveHeadersEnd: 1000};
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing,
        resourceType: 'Other'});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record], {
        coarseEstimateMultiplier: 1,
      });

      // this record's TTFB was 1000ms, it used SSL and was a fresh connection requiring a handshake
      // which needs ~4 RTs. We don't know its resource type so it'll be assumed that 40% of it was
      // server response time.
      // 600 ms / 4 = 150ms
      const expected = {min: 150, max: 150, avg: 150, median: 150};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should use coarse estimates on a per-origin basis', () => {
      const records = [
        createRecord({url: 'https://example.com', timing: {connectStart: 1, connectEnd: 100, sendStart: 150}}),
        createRecord({url: 'https://example2.com', timing: {sendStart: 150}}),
      ];
      const result = NetworkAnalyzer.estimateRTTByOrigin(records);
      assert.deepStrictEqual(result.get('https://example.com'), {min: 99, max: 99, avg: 99, median: 99});
      assert.deepStrictEqual(result.get('https://example2.com'), {min: 15, max: 15, avg: 15, median: 15});
    });

    it('should handle untrustworthy connection information', () => {
      const timing = {sendStart: 150};
      const recordA = createRecord({networkRequestTime: 0, networkEndTime: 1, timing,
        connectionReused: true});
      const recordB = createRecord({
        networkRequestTime: 0,
        networkEndTime: 1,
        timing,
        connectionId: 2,
        connectionReused: true,
      });
      const result = NetworkAnalyzer.estimateRTTByOrigin([recordA, recordB], {
        coarseEstimateMultiplier: 1,
      });
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should work on a real devtoolsLog', () => {
      return NetworkRecords.request(devtoolsLog, {computedCache: new Map()}).then(records => {
        const result = NetworkAnalyzer.estimateRTTByOrigin(records);
        assertCloseEnough(result.get('https://pwa.rocks').min, 3);
        assertCloseEnough(result.get('https://www.googletagmanager.com').min, 3);
        assertCloseEnough(result.get('https://www.google-analytics.com').min, 4);
      });
    });

    it('should approximate well with either method', () => {
      return NetworkRecords.request(devtoolsLog, {computedCache: new Map()}).then(records => {
        const result = NetworkAnalyzer.estimateRTTByOrigin(records).get(NetworkAnalyzer.SUMMARY);
        const resultApprox = NetworkAnalyzer.estimateRTTByOrigin(records, {
          forceCoarseEstimates: true,
        }).get(NetworkAnalyzer.SUMMARY);
        assertCloseEnough(result.min, resultApprox.min, 20);
        assertCloseEnough(result.avg, resultApprox.avg, 30);
        assertCloseEnough(result.median, resultApprox.median, 30);
      });
    });

    it('should use lrStatistics when needed', () => {
      global.isLightrider = true;
      const record = createRecord({timing: {}, lrStatistics: {TCPMs: 100}});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record]);
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should use lrStatistics when needed (h3)', () => {
      global.isLightrider = true;
      const record = createRecord({protocol: 'h3', timing: {}, lrStatistics: {TCPMs: 100}});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record]);
      const expected = {min: 100, max: 100, avg: 100, median: 100};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });
  });

  describe('#estimateServerResponseTimeByOrigin', () => {
    it('should estimate server response time using ttfb times', () => {
      const timing = {sendEnd: 100, receiveHeadersEnd: 200};
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const rttByOrigin = new Map([[NetworkAnalyzer.SUMMARY, 0]]);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([record], {rttByOrigin});
      const expected = {min: 100, max: 100, avg: 100, median: 100};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should subtract out rtt', () => {
      const timing = {sendEnd: 100, receiveHeadersEnd: 200};
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const rttByOrigin = new Map([[NetworkAnalyzer.SUMMARY, 50]]);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([record], {rttByOrigin});
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should compute rtts when not provided', () => {
      const timing = {connectStart: 5, connectEnd: 55, sendEnd: 100, receiveHeadersEnd: 200};
      const record = createRecord({networkRequestTime: 0, networkEndTime: 1, timing});
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([record]);
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should work on a real devtoolsLog', () => {
      return NetworkRecords.request(devtoolsLog, {computedCache: new Map()}).then(records => {
        const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records);
        assertCloseEnough(result.get('https://pwa.rocks').avg, 162);
        assertCloseEnough(result.get('https://www.googletagmanager.com').avg, 153);
        assertCloseEnough(result.get('https://www.google-analytics.com').avg, 161);
      });
    });

    it('should approximate well with either method', () => {
      return NetworkRecords.request(devtoolsLog, {computedCache: new Map()}).then(records => {
        const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records).get(
          NetworkAnalyzer.SUMMARY
        );
        const resultApprox = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
          forceCoarseEstimates: true,
        }).get(NetworkAnalyzer.SUMMARY);
        assertCloseEnough(result.min, resultApprox.min, 20);
        assertCloseEnough(result.avg, resultApprox.avg, 30);
        assertCloseEnough(result.median, resultApprox.median, 30);
      });
    });

    it('should use lrStatistics when needed', () => {
      global.isLightrider = true;
      const record = createRecord({timing: {}, lrStatistics: {TCPMs: 1, requestMs: 100}});
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([record]);
      const expected = {min: 100, max: 100, avg: 100, median: 100};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });
  });

  describe('#estimateThroughput', () => {
    const estimateThroughput = NetworkAnalyzer.estimateThroughput;

    function createThroughputRecord(responseHeadersEndTimeInS, networkEndTimeInS, extras) {
      return Object.assign(
        {
          responseHeadersEndTime: responseHeadersEndTimeInS * 1000,
          networkEndTime: networkEndTimeInS * 1000,
          transferSize: 1000,
          finished: true,
          failed: false,
          statusCode: 200,
          url: 'https://google.com/logo.png',
          parsedURL: {isValid: true, scheme: 'https'},
        },
        extras
      );
    }

    it('should return Infinity for no/missing records', () => {
      assert.equal(estimateThroughput([]), Infinity);
      assert.equal(estimateThroughput([createThroughputRecord(0, 0, {finished: false})]), Infinity);
    });

    it('should compute correctly for a basic waterfall', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(1, 2),
        createThroughputRecord(2, 6),
      ]);

      assert.equal(result, 500 * 8);
    });

    it('should compute correctly for concurrent requests', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(0.5, 1),
      ]);

      assert.equal(result, 2000 * 8);
    });

    it('should compute correctly for gaps', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(3, 4),
      ]);

      assert.equal(result, 1000 * 8);
    });

    it('should compute correctly for partially overlapping requests', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 1),
        createThroughputRecord(0.5, 1.5),
        createThroughputRecord(1.25, 3),
        createThroughputRecord(1.4, 4),
        createThroughputRecord(5, 9),
      ]);

      assert.equal(result, 625 * 8);
    });

    it('should exclude failed records', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {failed: true}),
      ]);
      assert.equal(result, 500 * 8);
    });

    it('should exclude cached records', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {statusCode: 304}),
      ]);
      assert.equal(result, 500 * 8);
    });

    it('should exclude unfinished records', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {finished: false}),
      ]);
      assert.equal(result, 500 * 8);
    });

    it('should exclude data URIs', () => {
      const result = estimateThroughput([
        createThroughputRecord(0, 2),
        createThroughputRecord(3, 4, {parsedURL: {scheme: 'data'}}),
      ]);
      assert.equal(result, 500 * 8);
    });
  });

  describe('#findMainDocument', () => {
    it('should find the main document', async () => {
      const records = await NetworkRecords.request(devtoolsLog, {computedCache: new Map()});
      const mainDocument = NetworkAnalyzer.findResourceForUrl(records, 'https://pwa.rocks/');
      assert.equal(mainDocument.url, 'https://pwa.rocks/');
    });

    it('should find the main document if the URL includes a fragment', async () => {
      const records = await NetworkRecords.request(devtoolsLog, {computedCache: new Map()});
      const mainDocument = NetworkAnalyzer.findResourceForUrl(records, 'https://pwa.rocks/#info');
      assert.equal(mainDocument.url, 'https://pwa.rocks/');
    });
  });

  describe('#resolveRedirects', () => {
    it('should resolve to the same document when no redirect', async () => {
      const records = await NetworkRecords.request(devtoolsLog, {computedCache: new Map()});

      const mainDocument = NetworkAnalyzer.findResourceForUrl(records, 'https://pwa.rocks/');
      const finalDocument = NetworkAnalyzer.resolveRedirects(mainDocument);
      assert.equal(mainDocument.url, finalDocument.url);
      assert.equal(finalDocument.url, 'https://pwa.rocks/');
    });

    it('should resolve to the final document with redirects', async () => {
      const records = await NetworkRecords.request(devtoolsLogWithRedirect, {
        computedCache: new Map(),
      });

      const mainDocument = NetworkAnalyzer.findResourceForUrl(records, 'http://www.vkontakte.ru/');
      const finalDocument = NetworkAnalyzer.resolveRedirects(mainDocument);
      assert.notEqual(mainDocument.url, finalDocument.url);
      assert.equal(finalDocument.url, 'https://m.vk.com/');
    });
  });
});
