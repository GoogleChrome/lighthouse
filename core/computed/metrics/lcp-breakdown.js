/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LargestContentfulPaint} from './largest-contentful-paint.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {TimeToFirstByte} from './time-to-first-byte.js';
import {LCPImageRecord} from '../lcp-image-record.js';
import {NavigationInsights} from '../navigation-insights.js';

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

      const lcpRecord = await LCPImageRecord.request(data, context);
      if (!lcpRecord) {
        return {ttfb};
      }

      // Official LCP^tm. Will be lantern result if simulated, otherwise same as observedLcp.
      const {timing: metricLcp} = await LargestContentfulPaint.request(data, context);
      const throttleRatio = metricLcp / observedLcp;

      const unclampedLoadStart = (lcpRecord.networkRequestTime - timeOrigin) * throttleRatio;
      const loadDelay = Math.max(ttfb, Math.min(unclampedLoadStart, metricLcp));

      const unclampedLoadEnd = (lcpRecord.networkEndTime - timeOrigin) * throttleRatio;
      const loadDuration = Math.max(loadDelay, Math.min(unclampedLoadEnd, metricLcp));

      return {
        ttfb,
        loadDelay,
        loadDuration,
      };
    }

    const {trace, settings, SourceMaps, HostDPR} = data;
    const navInsights =
      await NavigationInsights.request({trace, settings, SourceMaps, HostDPR}, context);
    const lcpBreakdown = navInsights.model.LCPBreakdown;
    if (lcpBreakdown instanceof Error) {
      throw new LighthouseError(LighthouseError.errors.NO_LCP, {}, {cause: lcpBreakdown});
    }

    if (!lcpBreakdown.subparts) {
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

