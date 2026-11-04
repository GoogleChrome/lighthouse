/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LargestContentfulPaint} from '../../../computed/metrics/largest-contentful-paint.js';
import {createTestTrace} from '../../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/paul/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/paul/devtoolslog.json', import.meta);

describe('Metrics: LCP', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute predicted value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await LargestContentfulPaint.request({trace, devtoolsLog, gatherContext,
      settings, URL, SourceMaps: [], HostDPR: 1, simulator: null}, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs)}).
toMatchInlineSnapshot(`
Object {
  "optimistic": 1059,
  "pessimistic": 1059,
  "timing": 1059,
}
`);
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await LargestContentfulPaint.request({trace, devtoolsLog, gatherContext,
      settings, URL, SourceMaps: [], HostDPR: 1, simulator: null}, context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 343577475882,
  "timing": 291.834,
}
`);
  });

  it('excludes unrelated non-blocking requests from optimisticGraph for image LCP', async () => {
    const mainDocUrl = 'http://www.example.com/';
    const heroImageUrl = 'http://www.example.com/image.png';
    const moduleUrl = 'http://www.example.com/app.mjs';
    const apiUrl = 'http://www.example.com/api';

    const networkRecords = [
      {
        requestId: '1',
        url: mainDocUrl,
        resourceType: 'Document',
        priority: 'VeryHigh',
        networkRequestTime: 0,
        networkEndTime: 500,
        transferSize: 10_000,
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '2',
        url: heroImageUrl,
        resourceType: 'Image',
        priority: 'High',
        renderBlocking: 'non_blocking',
        initiator: {type: 'parser', url: mainDocUrl},
        networkRequestTime: 500,
        networkEndTime: 1500,
        transferSize: 50_000,
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '3',
        url: moduleUrl,
        resourceType: 'Script',
        priority: 'High',
        renderBlocking: 'non_blocking',
        initiator: {type: 'parser', url: mainDocUrl},
        networkRequestTime: 500,
        networkEndTime: 1550,
        transferSize: 150_000,
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '4',
        url: apiUrl,
        resourceType: 'Fetch',
        priority: 'High',
        initiator: {type: 'script', url: moduleUrl},
        networkRequestTime: 1620,
        networkEndTime: 2400,
        transferSize: 200_000,
        frameId: 'ROOT_FRAME',
      },
    ];
    const testTrace = createTestTrace({
      frameUrl: mainDocUrl,
      firstContentfulPaint: 1000,
      largestContentfulPaint: 2500,
      traceEnd: 4000,
      networkRecords,
      topLevelTasks: [{
        ts: 1600,
        duration: 50,
        children: [{ts: 1600, duration: 50, url: moduleUrl, eventName: 'v8.evaluateModule'}],
      }],
    });
    const testDevtoolsLog = networkRecordsToDevtoolsLog(networkRecords);

    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const URL = {
      requestedUrl: mainDocUrl,
      mainDocumentUrl: mainDocUrl,
      finalDisplayedUrl: mainDocUrl,
    };
    const result = await LargestContentfulPaint.request({
      trace: testTrace,
      devtoolsLog: testDevtoolsLog,
      gatherContext,
      settings,
      URL,
      SourceMaps: [],
      HostDPR: 1,
      simulator: null,
    }, context);

    const optimisticUrls = [];
    result.optimisticGraph.traverse(node => {
      if (node.type === 'network') optimisticUrls.push(node.request.url);
    });
    const pessimisticUrls = [];
    result.pessimisticGraph.traverse(node => {
      if (node.type === 'network') pessimisticUrls.push(node.request.url);
    });

    expect(optimisticUrls).toEqual([mainDocUrl, heroImageUrl]);
    expect(pessimisticUrls).toEqual([mainDocUrl, heroImageUrl, moduleUrl, apiUrl]);
    expect(result.optimisticEstimate.timeInMs).toBeLessThan(result.pessimisticEstimate.timeInMs);
  });
});
