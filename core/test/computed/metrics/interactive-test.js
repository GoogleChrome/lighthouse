/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {Interactive} from '../../../computed/metrics/interactive.js';
import {getURLArtifactFromDevtoolsLog, loadTraceFixture} from '../../test-utils.js';

const {trace, devtoolsLog} = loadTraceFixture('progressive-app');
const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

/**
 * Simple wrapper to just coerce return type to LanternMetric.
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 * @return {Promise<LH.Artifacts.LanternMetric>}
 */
async function getResult(data, context) {
  const result = await Interactive.request(data, context);
  return /** @type {LH.Artifacts.LanternMetric} */ (result);
}

/**
 * @param {Array<Partial<LH.Artifacts.NetworkRequest> & {start: number, end: number}>} partialRecords
 * @param {number} timeOrigin
 * @return {LH.Artifacts.NetworkRequest[]}
 */
function generateNetworkRecords(partialRecords, timeOrigin) {
  const timeOriginInMs = timeOrigin / 1000;
  return partialRecords.map(item => {
    const record = {
      protocol: 'http',
      failed: item.failed || false,
      statusCode: item.statusCode || 200,
      requestMethod: item.requestMethod || 'GET',
      finished: typeof item.finished === 'undefined' ? true : item.finished,
      networkRequestTime: item.start + timeOriginInMs,
      networkEndTime: item.end === -1 ? -1 : item.end + timeOriginInMs,
    };
    return /** @type {LH.Artifacts.NetworkRequest} */ (record);
  });
}

describe('Metrics: TTI', () => {
  /** @type {{gatherMode: LH.Result.GatherMode}} */
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute a simulated value', async () => {
    const settings = /** @type {LH.Config.Settings} */ (
      {throttlingMethod: 'simulate'}
    );
    const context = {settings, computedCache: new Map()};
    const result = await getResult({trace, devtoolsLog, gatherContext, settings, URL}, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
      optimisticNodeTimings: result.optimisticEstimate.nodeTimings.size,
      pessimisticNodeTimings: result.pessimisticEstimate.nodeTimings.size,
    }).toMatchSnapshot();
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute an observed value (desktop)', async () => {
    const settings = /** @type {LH.Config.Settings} */ (
      {throttlingMethod: 'provided', formFactor: 'desktop'}
    );
    const context = {settings, computedCache: new Map()};
    const result = await getResult({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    assert.equal(Math.round(result.timing), 224);
    assert.equal(result.timestamp, 376406205074);
  });

  it('should compute an observed value (mobile)', async () => {
    const settings = /** @type {LH.Config.Settings} */ (
      {throttlingMethod: 'provided', formFactor: 'mobile'}
    );
    const context = {settings, computedCache: new Map()};
    const result = await getResult({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    assert.equal(Math.round(result.timing), 224);
    assert.equal(result.timestamp, 376406205074);
  });

  describe('#findOverlappingQuietPeriods', () => {
    it('should return entire range when no activity is present', () => {
      const timeOrigin = 220023532;
      const firstContentfulPaint = 2500 * 1000 + timeOrigin;
      const traceEnd = 10000 * 1000 + timeOrigin;
      const processedTrace = /** @type {LH.Artifacts.ProcessedNavigation} */ (
        {timestamps: {timeOrigin, firstContentfulPaint, traceEnd}}
      );
      const network = generateNetworkRecords([], timeOrigin);

      const result = Interactive.findOverlappingQuietPeriods([], network, processedTrace);
      assert.deepEqual(result.cpuQuietPeriod, {start: 0, end: traceEnd / 1000});
      assert.deepEqual(result.networkQuietPeriod, {start: 0, end: traceEnd / 1000});
    });

    it('should throw when trace ended too soon after FCP', () => {
      const timeOrigin = 220023532;
      const firstContentfulPaint = 2500 * 1000 + timeOrigin;
      const traceEnd = 5000 * 1000 + timeOrigin;
      const processedTrace = /** @type {LH.Artifacts.ProcessedNavigation} */ (
        {timestamps: {timeOrigin, firstContentfulPaint, traceEnd}}
      );
      const network = generateNetworkRecords([], timeOrigin);

      assert.throws(() => {
        Interactive.findOverlappingQuietPeriods([], network, processedTrace);
      }, /NO.*IDLE_PERIOD/);
    });

    it('should throw when CPU is quiet but network is not', () => {
      const timeOrigin = 220023532;
      const firstContentfulPaint = 2500 * 1000 + timeOrigin;
      const traceEnd = 10000 * 1000 + timeOrigin;
      const processedTrace = /** @type {LH.Artifacts.ProcessedNavigation} */ (
        {timestamps: {timeOrigin, firstContentfulPaint, traceEnd}}
      );

      const network = generateNetworkRecords([
        {start: 1400, end: 1900},
        {start: 2000, end: 9000},
        {start: 2000, end: 8000},
        {start: 2000, end: 8500},
      ], timeOrigin);

      assert.throws(() => {
        Interactive.findOverlappingQuietPeriods([], network, processedTrace);
      }, /NO.*NETWORK_IDLE_PERIOD/);
    });

    it('should throw when network is quiet but CPU is not', () => {
      const timeOrigin = 220023532;
      const firstContentfulPaint = 2500 * 1000 + timeOrigin;
      const traceEnd = 10000 * 1000 + timeOrigin;
      const processedTrace = /** @type {LH.Artifacts.ProcessedNavigation} */ (
        {timestamps: {timeOrigin, firstContentfulPaint, traceEnd}}
      );

      const cpu = [
        {start: 3000, end: 8000},
      ];
      const network = generateNetworkRecords([
        {start: 0, end: 1900},
      ], timeOrigin);

      assert.throws(() => {
        Interactive.findOverlappingQuietPeriods(cpu, network, processedTrace);
      }, /NO.*CPU_IDLE_PERIOD/);
    });

    it('should ignore unnecessary network requests', () => {
      const timeOrigin = 220023532;
      const firstContentfulPaint = 2500 * 1000 + timeOrigin;
      const traceEnd = 10000 * 1000 + timeOrigin;
      const processedTrace = /** @type {LH.Artifacts.ProcessedNavigation} */ (
        {timestamps: {timeOrigin, firstContentfulPaint, traceEnd}}
      );

      let network = generateNetworkRecords([
        {start: 0, end: -1, finished: false},
        {start: 0, end: 11000, failed: true},
        {start: 0, end: 11000, requestMethod: 'POST'},
        {start: 0, end: 11000, statusCode: 500},
      ], timeOrigin);
      // Triple the requests to ensure it's not just the 2-quiet kicking in
      network = network.concat(network).concat(network);

      const result = Interactive.findOverlappingQuietPeriods([], network, processedTrace);
      assert.deepEqual(result.cpuQuietPeriod, {start: 0, end: traceEnd / 1000});
      assert.deepEqual(result.networkQuietPeriod, {start: 0, end: traceEnd / 1000});
    });

    it('should find first overlapping quiet period', () => {
      const timeOrigin = 220023532;
      const firstContentfulPaint = 10000 * 1000 + timeOrigin;
      const traceEnd = 45000 * 1000 + timeOrigin;
      const processedTrace = /** @type {LH.Artifacts.ProcessedNavigation} */ (
        {timestamps: {timeOrigin, firstContentfulPaint, traceEnd}}
      );

      const cpu = [
        // quiet period before FCP
        {start: 9000, end: 9900},
        {start: 11000, end: 13000},
        // quiet period during network activity
        {start: 18500, end: 22000},
        {start: 23500, end: 26000},
        // 2nd quiet period during network activity
        {start: 31500, end: 34000},
        // final quiet period
      ];

      const network = generateNetworkRecords([
        // initial page load + script
        {start: 1400, end: 1900},
        {start: 1900, end: 9000},
        // script requests more content
        {start: 11500, end: 18500},
        {start: 11500, end: 19000},
        {start: 11500, end: 19000},
        {start: 11500, end: 19500},
        // quiet period during Main thread activity
        {start: 28000, end: 32000},
        {start: 28000, end: 32000},
        {start: 28000, end: 35000},
        // final quiet period
      ], timeOrigin);

      const result = Interactive.findOverlappingQuietPeriods(cpu, network, processedTrace);
      assert.deepEqual(result.cpuQuietPeriod, {
        start: 34000 + timeOrigin / 1000,
        end: traceEnd / 1000,
      });
      assert.deepEqual(result.networkQuietPeriod, {
        start: 32000 + timeOrigin / 1000,
        end: traceEnd / 1000,
      });
      assert.equal(result.cpuQuietPeriods.length, 3);
      assert.equal(result.networkQuietPeriods.length, 2);
    });
  });
});
