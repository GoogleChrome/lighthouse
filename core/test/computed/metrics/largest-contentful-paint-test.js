/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LargestContentfulPaint} from '../../../computed/metrics/largest-contentful-paint.js';
import {ArbitraryEqualityMap} from '../../../lib/arbitrary-equality-map.js';
import {NetworkRequest} from '../../../lib/network-request.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/paul/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/paul/devtoolslog.json', import.meta);

describe('Metrics: LCP', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute predicted value', async () => {
    // TODO(15841): investigate difference.
    if (process.env.INTERNAL_LANTERN_USE_TRACE !== undefined) {
      return;
    }

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
  "optimistic": 1445,
  "pessimistic": 1603,
  "timing": 1524,
}
`);
  });

  it('should include a slow main document response in the predicted value', async () => {
    const settings = {throttlingMethod: 'simulate', precomputedLanternData: null};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const metricData = {
      trace,
      devtoolsLog,
      gatherContext,
      settings,
      URL,
      SourceMaps: [],
      HostDPR: 1,
      simulator: null,
    };
    const context = {settings, computedCache: new Map()};

    const lanternResult = {
      timing: 1000,
      optimisticEstimate: {timeInMs: 900, nodeTimings: new Map()},
      pessimisticEstimate: {timeInMs: 1100, nodeTimings: new Map()},
      optimisticGraph: {},
      pessimisticGraph: {},
    };
    const mainResource = Object.assign(new NetworkRequest(), {
      parsedURL: {
        scheme: 'https',
        host: 'example.com',
        securityOrigin: 'https://example.com',
      },
      serverResponseTime: 5000,
      timing: {},
    });
    const networkAnalysis = {
      rtt: 100,
      additionalRttByOrigin: new Map([['https://example.com', 0]]),
      serverResponseTimeByOrigin: new Map([['https://example.com', 50]]),
      throughput: 1000,
    };

    const setCachedArtifact = (name, key, value) => {
      const cache = new ArbitraryEqualityMap();
      cache.set(key, Promise.resolve(value));
      context.computedCache.set(name, cache);
    };
    setCachedArtifact('LanternLargestContentfulPaint', metricData, lanternResult);
    setCachedArtifact('MainResource', {URL, devtoolsLog}, mainResource);
    setCachedArtifact('NetworkAnalysis', devtoolsLog, networkAnalysis);

    const result = await LargestContentfulPaint.computeSimulatedMetric(metricData, context);

    expect(result.timing).toBe(5950);
    expect(result.optimisticEstimate.timeInMs).toBe(5850);
    expect(result.pessimisticEstimate.timeInMs).toBe(6050);
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
});
