/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/lantern.js';
import {NetworkRequest} from '../../lib/network-request.js';
import {makeComputedArtifact} from '../computed-artifact.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LanternLargestContentfulPaint} from './lantern-largest-contentful-paint.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {TimeToFirstByte} from './time-to-first-byte.js';
import {LCPNetworkRecord} from '../lcp-network-record.js';
import {NavigationInsights} from '../navigation-insights.js';

/**
 * Note: this omits renderDelay for simulated throttling.
 */
class LCPBreakdown {
  /**
   * @param {Map<LH.Gatherer.Simulation.GraphNode, LH.Gatherer.Simulation.NodeTiming>} nodeTimings
   * @param {LH.Artifacts.NetworkRequest} lcpRecord
   * @return {LH.Gatherer.Simulation.NodeTiming|undefined}
   */
  static findLcpNodeTiming(nodeTimings, lcpRecord) {
    for (const [node, timing] of nodeTimings) {
      if (node.type === 'network' && node.id === lcpRecord.requestId) {
        return timing;
      }
    }
    return undefined;
  }

  /**
   * Returns simulated [loadStart, loadEnd] for `lcpRecord` from Lantern's nodeTimings,
   * or undefined if the record is non-network or absent from both graphs.
   * Uses `queuedTime` (when Chrome enqueues the request) rather than `startTime`
   * (when a connection slot opens), matching how observed LCPBreakdown defines loadDelay.
   * @param {LH.Artifacts.LanternMetric} lanternLcp
   * @param {LH.Artifacts.NetworkRequest} lcpRecord
   * @return {{loadStart: number, loadEnd: number}|undefined}
   */
  static getSimulatedLcpLoadBounds(lanternLcp, lcpRecord) {
    if (NetworkRequest.isNonNetworkRequest(lcpRecord)) return undefined;

    const optimisticTiming =
      this.findLcpNodeTiming(lanternLcp.optimisticEstimate.nodeTimings, lcpRecord);
    const pessimisticTiming =
      this.findLcpNodeTiming(lanternLcp.pessimisticEstimate.nodeTimings, lcpRecord);

    if (optimisticTiming && pessimisticTiming) {
      const {optimistic, pessimistic} = Lantern.Metrics.LargestContentfulPaint.coefficients;
      const weightSum = optimistic + pessimistic;
      /** @param {number} o @param {number} p */
      const blend = (o, p) => (optimistic * o + pessimistic * p) / weightSum;
      return {
        loadStart: blend(optimisticTiming.queuedTime, pessimisticTiming.queuedTime),
        loadEnd: blend(optimisticTiming.endTime, pessimisticTiming.endTime),
      };
    }

    const singleTiming = optimisticTiming || pessimisticTiming;
    if (singleTiming) {
      return {
        loadStart: singleTiming.queuedTime,
        loadEnd: singleTiming.endTime,
      };
    }

    return undefined;
  }

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

      const {timing: ttfb} = await TimeToFirstByte.request(data, context);

      const lcpRecord = await LCPNetworkRecord.request(data, context);
      if (!lcpRecord) {
        return {ttfb};
      }

      const lanternLcp = await LanternLargestContentfulPaint.request(data, context);
      const metricLcp = lanternLcp.timing;

      let {loadStart: unclampedLoadStart, loadEnd: unclampedLoadEnd} =
        this.getSimulatedLcpLoadBounds(lanternLcp, lcpRecord) || {};

      if (unclampedLoadStart === undefined || unclampedLoadEnd === undefined) {
        const timeOrigin = processedNavigation.timestamps.timeOrigin / 1000;
        const throttleRatio = metricLcp / observedLcp;
        unclampedLoadStart = (lcpRecord.networkRequestTime - timeOrigin) * throttleRatio;
        unclampedLoadEnd = (lcpRecord.networkEndTime - timeOrigin) * throttleRatio;
      }

      // Clamp to [ttfb, metricLcp]. `unclampedLoadStart` can be below `ttfb` when
      // observed TTFB exceeds Lantern's simulated main-document finish time (yielding loadDelay=0),
      // and `unclampedLoadEnd` can exceed `metricLcp` for low-priority LCP images.
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

