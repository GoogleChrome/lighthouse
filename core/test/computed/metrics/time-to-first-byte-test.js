/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {TimeToFirstByte} from '../../../computed/metrics/time-to-first-byte.js';
import {createTestTrace} from '../../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {defaultSettings} from '../../../config/constants.js';
import {readJson, getURLArtifactFromDevtoolsLog} from '../../test-utils.js';

const trace = readJson('../../fixtures/traces/frame-metrics-m90.json', import.meta);
const devtoolsLog = readJson('../../fixtures/traces/frame-metrics-m90.devtools.log.json', import.meta);

let requestedUrl = 'http://example.com:3000';
let mainDocumentUrl = 'http://www.example.com:3000';

function mockData(networkRecords) {
  return {
    settings: JSON.parse(JSON.stringify(defaultSettings)),
    trace: createTestTrace({
      traceEnd: 6000,
      largestContentfulPaint: 4500,
    }),
    devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
    URL: {
      requestedUrl,
      mainDocumentUrl,
      finalDisplayedUrl: mainDocumentUrl,
    },
    gatherContext: {gatherMode: 'navigation'},
  };
}

function mockNetworkRecords() {
  return [{
    requestId: '2',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 0,
    networkEndTime: 300,
    timing: {sendEnd: 0},
    responseHeadersTransferSize: 300,
    transferSize: 300,
    url: requestedUrl,
    frameId: 'ROOT_FRAME',
    responseHeaders: [{name: 'Content-Encoding', value: 'gzip'}],
  },
  {
    requestId: '2:redirect',
    resourceType: 'Document',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 300,
    responseHeadersEndTime: 400,
    networkEndTime: 500,
    timing: {sendEnd: 0, receiveHeadersStart: 100},
    transferSize: 16_000,
    url: mainDocumentUrl,
    frameId: 'ROOT_FRAME',
    responseHeaders: [{name: 'Content-Encoding', value: 'gzip'}],
  }];
}

describe('Metrics: TTFB', () => {
  beforeEach(() => {
    requestedUrl = 'http://example.com:3000';
    mainDocumentUrl = 'http://www.example.com:3000';
  });

  it('should return TTFB for real trace', async () => {
    const data = {
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      trace,
      devtoolsLog,
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      gatherContext: {gatherMode: 'navigation'},
    };

    const context = {settings: data.settings, computedCache: new Map()};
    const result = await TimeToFirstByte.request(data, context);

    expect(result.timing).toBeCloseTo(1014.7, 0.1);
    expect(result.timestamp).toBeUndefined();
  });

  it('should compute predicted value', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);

    const context = {settings: data.settings, computedCache: new Map()};
    const result = await TimeToFirstByte.request(data, context);

    // 3 * 150 RTT + 99 server response time
    // 99 Comes from (100ms observed TTFB - 1ms observed RTT)
    expect(result.timing).toEqual(549);
    expect(result.timestamp).toBeUndefined();
  });

  it('should compute predicted value with SSL', async () => {
    mainDocumentUrl = 'https://www.example.com:3000';
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);

    const context = {settings: data.settings, computedCache: new Map()};
    const result = await TimeToFirstByte.request(data, context);

    // 4 * 150 RTT + 99.1 server response time
    // 99.1 Comes from (100ms observed TTFB - 0.9ms observed RTT)
    expect(result.timing).toEqual(699.1);
    expect(result.timestamp).toBeUndefined();
  });

  it('should compute an observed value', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);
    data.settings.throttlingMethod = 'provided';

    const context = {settings: data.settings, computedCache: new Map()};
    const result = await TimeToFirstByte.request(data, context);

    expect(result.timing).toEqual(400);
    expect(result.timestamp).toEqual(400_000);
  });
});
