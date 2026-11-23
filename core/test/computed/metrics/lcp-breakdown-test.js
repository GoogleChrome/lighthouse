/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LCPBreakdown} from '../../../computed/metrics/lcp-breakdown.js';
import {createTestTrace} from '../../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {defaultSettings} from '../../../config/constants.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const textLcpTrace = readJson('../../fixtures/traces/frame-metrics-m90.json', import.meta);
const textLcpDevtoolsLog = readJson('../../fixtures/traces/frame-metrics-m90.devtools.log.json', import.meta);
const imageLcpTrace = readJson('../../fixtures/artifacts/amp/trace.json.gz', import.meta);
const imageLcpDevtoolsLog = readJson('../../fixtures/artifacts/amp/devtoolslog.json.gz', import.meta);

const requestedUrl = 'http://example.com:3000';
const mainDocumentUrl = 'http://www.example.com:3000';

const scriptUrl = 'http://www.example.com/script.js';
const imageUrl = 'http://www.example.com/image.png';

/** @type {LH.Artifacts['GatherContext']} */
const gatherContext = {gatherMode: 'navigation'};

/**
 * @param {Array<import('../../network-records-to-devtools-log.js').NetworkRequestInput>} networkRecords
 */
function mockData(networkRecords) {
  return {
    settings: JSON.parse(JSON.stringify(defaultSettings)),
    trace: createTestTrace({
      traceEnd: 6000,
      largestContentfulPaint: 4500,
      networkRecords,
    }),
    devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
    URL: {
      requestedUrl,
      mainDocumentUrl,
      finalDisplayedUrl: mainDocumentUrl,
    },
    gatherContext,
    simulator: null,
    SourceMaps: [],
    HostDPR: 1,
  };
}

/**
 * @return {Array<import('../../network-records-to-devtools-log.js').NetworkRequestInput>}
 */
function mockNetworkRecords() {
  return [{
    requestId: 'NAVIGATION_ID',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 0,
    networkEndTime: 500,
    timing: {sendEnd: 0, receiveHeadersEnd: 500},
    responseHeadersTransferSize: 400,
    transferSize: 400,
    url: requestedUrl,
    frameId: 'ROOT_FRAME',
  },
  {
    requestId: 'NAVIGATION_ID:redirect',
    resourceType: 'Document',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 500,
    responseHeadersEndTime: 800,
    networkEndTime: 1000,
    timing: {sendEnd: 0, receiveHeadersEnd: 300},
    transferSize: 16_000,
    url: mainDocumentUrl,
    frameId: 'ROOT_FRAME',
  },
  {
    requestId: '3',
    resourceType: 'Script',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 1000,
    networkEndTime: 2000,
    transferSize: 32_000,
    url: scriptUrl,
    initiator: {type: 'parser', url: mainDocumentUrl},
    frameId: 'ROOT_FRAME',
  },
  {
    requestId: '4',
    resourceType: 'Image',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 2000,
    networkEndTime: 4500,
    transferSize: 640_000,
    url: imageUrl,
    initiator: {type: 'script', url: scriptUrl},
    frameId: 'ROOT_FRAME',
  }];
}

describe('LCPBreakdown', () => {
  it('returns breakdown for a real trace with image LCP', async () => {
    const data = {
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      trace: imageLcpTrace,
      devtoolsLog: imageLcpDevtoolsLog,
      URL: getURLArtifactFromDevtoolsLog(imageLcpDevtoolsLog),
      SourceMaps: [],
      HostDPR: 1,
      gatherContext,
      simulator: null,
    };

    const result = await LCPBreakdown.request(data, {computedCache: new Map()});

    expect(result.ttfb).toBeCloseTo(1245.5, 0.1);
    expect(result.loadDelay).toBeCloseTo(0, 0.1);
    expect(result.loadDuration).toBeCloseTo(837.8, 0.1);
  });

  it('returns breakdown for a real trace with text LCP', async () => {
    const data = {
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      trace: textLcpTrace,
      devtoolsLog: textLcpDevtoolsLog,
      URL: getURLArtifactFromDevtoolsLog(textLcpDevtoolsLog),
      SourceMaps: [],
      HostDPR: 1,
      gatherContext,
      simulator: null,
    };

    const result = await LCPBreakdown.request(data, {computedCache: new Map()});

    expect(result.ttfb).toBeCloseTo(1014.7, 0.1);
    expect(result.loadDelay).toBeUndefined();
    expect(result.loadDuration).toBeUndefined();
  });

  it('returns breakdown for image LCP', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);

    const result = await LCPBreakdown.request(data, {computedCache: new Map()});

    expect(result.ttfb).toBeCloseTo(800, 0.1);
    expect(result.loadDelay).toBeCloseTo(1905, 0.1);
    expect(result.loadDuration).toBeCloseTo(3216, 0.1);
  });

  it('uses simulated nodeTimings when unthrottled image downloads near-instantly', async () => {
    /** @type {Array<import('../../network-records-to-devtools-log.js').NetworkRequestInput>} */
    const networkRecords = [
      {
        requestId: 'NAVIGATION_ID',
        resourceType: 'Document',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 0,
        responseHeadersEndTime: 50,
        networkEndTime: 60,
        timing: {sendEnd: 0, receiveHeadersEnd: 50},
        transferSize: 16_000,
        url: requestedUrl,
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '2',
        resourceType: 'Image',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 100,
        networkEndTime: 102,
        transferSize: 500_000,
        url: imageUrl,
        initiator: {type: 'parser', url: requestedUrl},
        frameId: 'ROOT_FRAME',
      },
    ];
    const data = {
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      trace: createTestTrace({
        traceEnd: 500,
        largestContentfulPaint: 150,
        networkRecords,
      }),
      devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
      URL: {
        requestedUrl,
        mainDocumentUrl: requestedUrl,
        finalDisplayedUrl: requestedUrl,
      },
      gatherContext,
      simulator: null,
      SourceMaps: [],
      HostDPR: 1,
    };

    const result = await LCPBreakdown.request(data, {computedCache: new Map()});

    // Under simulated Slow 4G, a 500 KB image should take >2000ms to load,
    // not ~2ms scaled by metricLcp / observedLcp (~40ms).
    expect(result.ttfb).toBeCloseTo(499.1, 0.1);
    expect(result.loadDelay).toBeCloseTo(300, 0.1);
    expect(result.loadDuration).toBeCloseTo(3030, 0.1);
  });

  it('falls back to ratio scaling when LCP node is absent from Lantern graphs', async () => {
    /** @type {Array<import('../../network-records-to-devtools-log.js').NetworkRequestInput>} */
    const networkRecords = [
      {
        requestId: 'NAVIGATION_ID',
        resourceType: 'Document',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 0,
        responseHeadersEndTime: 50,
        networkEndTime: 100,
        timing: {sendEnd: 0, receiveHeadersEnd: 50},
        transferSize: 16_000,
        url: requestedUrl,
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '2',
        resourceType: 'Media',
        mimeType: 'video/mp4',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 150,
        networkEndTime: 400,
        transferSize: 500_000,
        url: imageUrl,
        initiator: {type: 'parser', url: requestedUrl},
        frameId: 'ROOT_FRAME',
      },
    ];
    const data = {
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      trace: createTestTrace({
        traceEnd: 600,
        largestContentfulPaint: 450,
        networkRecords,
      }),
      devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
      URL: {
        requestedUrl,
        mainDocumentUrl: requestedUrl,
        finalDisplayedUrl: requestedUrl,
      },
      gatherContext,
      simulator: null,
      SourceMaps: [],
      HostDPR: 1,
    };

    const result = await LCPBreakdown.request(data, {computedCache: new Map()});

    expect(result.ttfb).toBeCloseTo(499.1, 0.1);
    expect(result.loadDelay).toBeCloseTo(0, 0.1);
    expect(result.loadDuration).toBeCloseTo(211.2, 0.1);
  });

  describe('findLcpNodeTiming', () => {
    it('matches network nodes by requestId and ignores non-network nodes', () => {
      const cpuNode = /** @type {any} */ ({type: 'cpu', id: '4:redirect'});
      const otherNetNode = /** @type {any} */ ({type: 'network', id: '3'});
      const lcpNetNode = /** @type {any} */ ({type: 'network', id: '4:redirect'});
      const lcpTiming = {startTime: 1000, endTime: 2500, queuedTime: 800, duration: 1500};
      const nodeTimings = new Map([
        [cpuNode, {startTime: 100, endTime: 200, queuedTime: 100, duration: 100}],
        [otherNetNode, {startTime: 200, endTime: 400, queuedTime: 200, duration: 200}],
        [lcpNetNode, lcpTiming],
      ]);

      const match = LCPBreakdown.findLcpNodeTiming(
        nodeTimings,
        /** @type {any} */ ({requestId: '4:redirect'})
      );
      expect(match).toBe(lcpTiming);

      const missing = LCPBreakdown.findLcpNodeTiming(
        nodeTimings,
        /** @type {any} */ ({requestId: '999'})
      );
      expect(missing).toBeUndefined();
    });
  });

  it('returns observed for image LCP', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);
    data.settings.throttlingMethod = 'provided';

    const result = await LCPBreakdown.request(data, {computedCache: new Map()});

    expect(result.ttfb).toBeCloseTo(800, 0.1);
    expect(result.loadDelay).toBeCloseTo(1200, 0.1);
    expect(result.loadDuration).toBeCloseTo(2500, 0.1);
  });

  it('returns breakdown for text LCP', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);
    const eventIndex =
      data.trace.traceEvents.findIndex(e => e.name === 'LargestImagePaint::Candidate');
    data.trace.traceEvents.splice(eventIndex, 1);

    const result = await LCPBreakdown.request(data, {computedCache: new Map()});

    expect(result.ttfb).toBeCloseTo(800, 0.1);
    expect(result.loadDelay).toBeUndefined();
    expect(result.loadDuration).toBeUndefined();
  });

  it('throws if there was no LCP', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);
    const eventIndex =
      data.trace.traceEvents.findIndex(e => e.name === 'largestContentfulPaint::Candidate');
    data.trace.traceEvents.splice(eventIndex, 1);

    const resultPromise = LCPBreakdown.request(data, {computedCache: new Map()});

    await expect(resultPromise).rejects.toThrow('NO_LCP');
  });
});
