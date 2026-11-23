/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from '../../lib/lantern/lantern.js';
import lanternTraceSaver from '../../lib/lantern-trace-saver.js';

/**
 * @param {Partial<Lantern.Types.NetworkRequest>} props
 * @return {Lantern.Graph.NetworkNode}
 */
function createNetworkNode(props) {
  const url = props.url || 'https://example.com/';
  /** @type {Partial<Lantern.Types.NetworkRequest>} */
  const request = {
    requestId: url,
    url,
    protocol: 'h2',
    parsedURL: {scheme: new URL(url).protocol.slice(0, -1), host: '', securityOrigin: ''},
    transferSize: 1000,
    resourceSize: 2000,
    statusCode: 200,
    mimeType: 'text/html',
    priority: 'VeryHigh',
    fromDiskCache: false,
    failed: false,
    ...props,
  };
  return new Lantern.Graph.NetworkNode(/** @type {Lantern.Types.NetworkRequest} */ (request));
}

/**
 * @param {LH.Trace} trace
 * @param {string} name
 * @return {any[]}
 */
function getEventDataByName(trace, name) {
  return trace.traceEvents.filter(e => e.name === name).map(e => e.args.data);
}

describe('lantern-trace-saver', () => {
  describe('convertNodeTimingsToTrace', () => {
    it('converts network nodes with connection timing', () => {
      const node = createNetworkNode({
        url: 'https://example.com/',
        rawRequest: {requestMethod: 'GET', fetchedViaServiceWorker: false},
      });
      const nodeTimings = new Map([[node, {
        startTime: 0,
        endTime: 100,
        connectionTiming: {
          dnsResolutionTime: 10,
          connectionTime: 30,
          sslTime: 10,
          timeToFirstByte: 60,
        },
      }]]);

      // @ts-expect-error - only the fields used by the saver are set.
      const trace = lanternTraceSaver.convertNodeTimingsToTrace(nodeTimings);

      const [sendRequest] = getEventDataByName(trace, 'ResourceSendRequest');
      assert.equal(sendRequest.url, 'https://example.com/');
      assert.equal(sendRequest.requestMethod, 'GET');

      const [receiveResponse] = getEventDataByName(trace, 'ResourceReceiveResponse');
      assert.deepEqual(receiveResponse.timing, {
        requestTime: 1000,
        dnsStart: 0,
        dnsEnd: 10,
        connectStart: 10,
        connectEnd: 30,
        sslStart: 20,
        sslEnd: 30,
        sendStart: 30,
        sendEnd: 30,
        receiveHeadersEnd: 60,
        workerStart: -1,
        workerReady: -1,
        proxyStart: -1,
        proxyEnd: -1,
        pushStart: 0,
        pushEnd: 0,
      });
    });

    it('converts connectionless network nodes without connection timing', () => {
      const docNode = createNetworkNode({url: 'https://example.com/'});
      const blobNode = createNetworkNode({url: 'blob:https://example.com/1234', protocol: 'blob'});
      const cachedNode = createNetworkNode({url: 'https://example.com/cached.js', fromDiskCache: true});
      assert.ok(blobNode.isConnectionless);
      assert.ok(cachedNode.isConnectionless);

      // This is how the Simulator completes connectionless nodes.
      const nodeTimings = new Map([
        [docNode, {startTime: 0, endTime: 100, connectionTiming: {timeToFirstByte: 50}}],
        [blobNode, {startTime: 100, endTime: 110, connectionTiming: undefined}],
        [cachedNode, {startTime: 110, endTime: 120, connectionTiming: undefined}],
      ]);

      // @ts-expect-error - only the fields used by the saver are set.
      const trace = lanternTraceSaver.convertNodeTimingsToTrace(nodeTimings);

      const sendRequests = getEventDataByName(trace, 'ResourceSendRequest');
      assert.deepEqual(sendRequests.map(e => e.url), [
        'https://example.com/',
        'blob:https://example.com/1234',
        'https://example.com/cached.js',
      ]);

      const receiveResponses = getEventDataByName(trace, 'ResourceReceiveResponse');
      for (const event of receiveResponses.slice(1)) {
        assert.equal(event.timing.dnsStart, -1);
        assert.equal(event.timing.connectEnd, -1);
        assert.equal(event.timing.sslStart, -1);
        assert.equal(event.timing.receiveHeadersEnd, 0);
      }
      assert.equal(receiveResponses[2].fromCache, true);
    });

    it('uses the Lantern request when rawRequest is not a Lighthouse network request', () => {
      // e.g. graphs built by the trace engine, where `rawRequest` is a trace event.
      const node = createNetworkNode({
        url: 'https://example.com/',
        rawRequest: {args: {data: {url: 'https://example.com/'}}},
      });
      const nodeTimings = new Map([[node, {
        startTime: 0,
        endTime: 100,
        connectionTiming: {timeToFirstByte: 50},
      }]]);

      // @ts-expect-error - only the fields used by the saver are set.
      const trace = lanternTraceSaver.convertNodeTimingsToTrace(nodeTimings);

      const [sendRequest] = getEventDataByName(trace, 'ResourceSendRequest');
      assert.equal(sendRequest.url, 'https://example.com/');
      assert.equal(sendRequest.priority, 'VeryHigh');
      const [receiveResponse] = getEventDataByName(trace, 'ResourceReceiveResponse');
      assert.equal(receiveResponse.statusCode, 200);
      assert.equal(receiveResponse.mimeType, 'text/html');
    });

    it('skips data URLs', () => {
      const docNode = createNetworkNode({url: 'https://example.com/'});
      const dataNode = createNetworkNode({url: 'data:text/plain,hi', protocol: 'data'});
      const nodeTimings = new Map([
        [docNode, {startTime: 0, endTime: 100, connectionTiming: {timeToFirstByte: 50}}],
        [dataNode, {startTime: 100, endTime: 101, connectionTiming: undefined}],
      ]);

      // @ts-expect-error - only the fields used by the saver are set.
      const trace = lanternTraceSaver.convertNodeTimingsToTrace(nodeTimings);

      const sendRequests = getEventDataByName(trace, 'ResourceSendRequest');
      assert.deepEqual(sendRequests.map(e => e.url), ['https://example.com/']);
    });
  });
});
