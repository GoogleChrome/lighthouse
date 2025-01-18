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

class LCPBreakdown {
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<{ttfb: number, loadStart?: number, loadEnd?: number}>}
   */
  static async compute_(data, context) {
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
    const loadStart = Math.max(ttfb, Math.min(unclampedLoadStart, metricLcp));

    const unclampedLoadEnd = (lcpRecord.networkEndTime - timeOrigin) * throttleRatio;
    const loadEnd = Math.max(loadStart, Math.min(unclampedLoadEnd, metricLcp));

    return {
      ttfb,
      loadStart,
      loadEnd,
    };
  }
}

const LCPBreakdownComputed = makeComputedArtifact(
  LCPBreakdown,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {LCPBreakdownComputed as LCPBreakdown};

