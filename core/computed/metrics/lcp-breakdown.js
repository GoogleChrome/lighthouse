/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LanternLargestContentfulPaint} from './lantern-largest-contentful-paint.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {TimeToFirstByte} from './time-to-first-byte.js';
import {LCPNetworkRecord} from '../lcp-network-record.js';
import {NavigationInsights} from '../navigation-insights.js';

/**
 * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
 * @param {string} requestId
 * @return {LH.Gatherer.Simulation.NodeTiming|undefined}
 */
function findNetworkNodeTiming(nodeTimings, requestId) {
  for (const [node, timing] of nodeTimings.entries()) {
    if (node.type === 'network' && node.request.requestId === requestId) {
      return timing;
    }
  }
}

/**
 * Note: this omits renderDelay for simulated throttling.
 */
class LCPBreakdown {
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<{ttfb: number, loadDelay?: number, loadDuration?: number, renderDelay?: number}>}
   */
  static async compute_(data, context) {
    if (data.settings.throttlingMethod === 'simulate') {
      const processedNavigation = await ProcessedNavigation.request(data.trace, context);
      const observedLcp = processedNavigation.timings.largestContentfulPaint;
      if (observedLcp === undefined) {
        throw new LighthouseError(LighthouseError.errors.NO_LCP);
      }
      const timeOrigin = processedNavigation.timestamps.timeOrigin / 1000;

      const {timing: ttfb} = await TimeToFirstByte.request(data, context);

      const lcpRecord = await LCPNetworkRecord.request(data, context);
      if (!lcpRecord) {
        return {ttfb};
      }

      const lcpResult = await LanternLargestContentfulPaint.request(data, context);
      const metricLcp = lcpResult.timing;
      const optimisticTiming = findNetworkNodeTiming(
        lcpResult.optimisticEstimate.nodeTimings,
        lcpRecord.requestId
      );
      const pessimisticTiming = findNetworkNodeTiming(
        lcpResult.pessimisticEstimate.nodeTimings,
        lcpRecord.requestId
      );

      let unclampedLoadStart;
      let unclampedLoadEnd;
      if (optimisticTiming && pessimisticTiming) {
        const {optimistic, pessimistic} = LanternLargestContentfulPaint.coefficients;
        unclampedLoadStart =
          optimistic * optimisticTiming.startTime + pessimistic * pessimisticTiming.startTime;
        unclampedLoadEnd =
          optimistic * optimisticTiming.endTime + pessimistic * pessimisticTiming.endTime;
      } else if (optimisticTiming) {
        unclampedLoadStart = optimisticTiming.startTime;
        unclampedLoadEnd = optimisticTiming.endTime;
      } else if (pessimisticTiming) {
        unclampedLoadStart = pessimisticTiming.startTime;
        unclampedLoadEnd = pessimisticTiming.endTime;
      } else {
        const throttleRatio = metricLcp / observedLcp;
        unclampedLoadStart = (lcpRecord.networkRequestTime - timeOrigin) * throttleRatio;
        unclampedLoadEnd = (lcpRecord.networkEndTime - timeOrigin) * throttleRatio;
      }

      const loadStart = Math.max(ttfb, Math.min(unclampedLoadStart, metricLcp));
      const loadEnd = Math.max(loadStart, Math.min(unclampedLoadEnd, metricLcp));

      return {
        ttfb,
        loadDelay: loadStart - ttfb,
        loadDuration: loadEnd - loadStart,
      };
    }

    const {trace, settings, SourceMaps, HostDPR} = data;
    const navInsights =
      await NavigationInsights.request({trace, settings, SourceMaps, HostDPR}, context);
    const lcpBreakdown = navInsights.model.LCPBreakdown;
    if (lcpBreakdown instanceof Error) {
      throw new LighthouseError(LighthouseError.errors.NO_LCP, {}, {cause: lcpBreakdown});
    }

    if (!lcpBreakdown || !lcpBreakdown.subparts) {
      throw new LighthouseError(LighthouseError.errors.NO_LCP);
    }

    return {
      ttfb: lcpBreakdown.subparts.ttfb.range / 1000,
      loadDelay: lcpBreakdown.subparts.loadDelay !== undefined ?
        lcpBreakdown.subparts.loadDelay.range / 1000 :
        undefined,
      loadDuration: lcpBreakdown.subparts.loadDuration !== undefined ?
        lcpBreakdown.subparts.loadDuration.range / 1000 :
        undefined,
      renderDelay: lcpBreakdown.subparts.renderDelay.range / 1000,
    };
  }
}

const LCPBreakdownComputed = makeComputedArtifact(
  LCPBreakdown,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps', 'HostDPR']
);
export {LCPBreakdownComputed as LCPBreakdown};

