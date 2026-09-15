/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Computed Largest Contentful Paint (LCP), the paint time of the largest in-viewport contentful element
 * COMPAT: LCP's trace event was first introduced in m78. We can't surface an LCP for older Chrome versions
 * @see https://github.com/WICG/largest-contentful-paint
 * @see https://wicg.github.io/largest-contentful-paint/
 * @see https://web.dev/lcp
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {MainResource} from '../main-resource.js';
import {NetworkAnalysis} from '../network-analysis.js';
import {NavigationMetric} from './navigation-metric.js';
import {LighthouseError} from '../../lib/lh-error.js';
import * as Lantern from '../../lib/lantern/lantern.js';
import {LanternLargestContentfulPaint} from './lantern-largest-contentful-paint.js';

class LargestContentfulPaint extends NavigationMetric {
  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async computeSimulatedMetric(data, context) {
    const metricData = NavigationMetric.getMetricComputationInput(data);
    const [result, mainResource, networkAnalysis] = await Promise.all([
      LanternLargestContentfulPaint.request(metricData, context),
      MainResource.request(data, context),
      NetworkAnalysis.request(data.devtoolsLog, context),
    ]);

    const origin = mainResource.parsedURL.securityOrigin;
    const simulatedResponseTime = data.settings.precomputedLanternData ?
      data.settings.precomputedLanternData.serverResponseTimeByOrigin[origin] :
      networkAnalysis.serverResponseTimeByOrigin.get(origin);
    if (simulatedResponseTime === undefined) return result;

    const rtt = networkAnalysis.rtt +
      (networkAnalysis.additionalRttByOrigin.get(origin) ?? 0);
    const responseTimeSummary =
      Lantern.Core.NetworkAnalyzer.estimateServerResponseTimeByOrigin(
        [mainResource], {rttByOrigin: new Map([[origin, rtt]])}).get(origin);
    if (!responseTimeSummary) return result;

    const responseTimeCorrection = Math.max(0, responseTimeSummary.median - simulatedResponseTime);
    if (!responseTimeCorrection) return result;

    return {
      ...result,
      timing: result.timing + responseTimeCorrection,
      optimisticEstimate: {
        ...result.optimisticEstimate,
        timeInMs: result.optimisticEstimate.timeInMs + responseTimeCorrection,
      },
      pessimisticEstimate: {
        ...result.pessimisticEstimate,
        timeInMs: result.pessimisticEstimate.timeInMs + responseTimeCorrection,
      },
    };
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data) {
    const {processedNavigation} = data;
    if (processedNavigation.timings.largestContentfulPaint === undefined) {
      throw new LighthouseError(LighthouseError.errors.NO_LCP);
    }

    return {
      timing: processedNavigation.timings.largestContentfulPaint,
      timestamp: processedNavigation.timestamps.largestContentfulPaint,
    };
  }
}

const LargestContentfulPaintComputed = makeComputedArtifact(
  LargestContentfulPaint,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps', 'HostDPR']
);
export {LargestContentfulPaintComputed as LargestContentfulPaint};
