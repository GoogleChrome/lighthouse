/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {calculateDocFirstByteTs} from '@paulirish/trace_engine/models/trace/insights/Common.js';

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';
import {MainResource} from '../main-resource.js';
import {NetworkAnalysis} from '../network-analysis.js';
import {NavigationInsights} from '../navigation-insights.js';
import {TraceEngineResult} from '../trace-engine-result.js';

class TimeToFirstByte extends NavigationMetric {
  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeSimulatedMetric(data, context) {
    const mainResource = await MainResource.request(data, context);
    const networkAnalysis = await NetworkAnalysis.request(data.devtoolsLog, context);

    const observedTTFB = (await this.computeObservedMetric(data, context)).timing;
    const observedResponseTime =
      networkAnalysis.serverResponseTimeByOrigin.get(mainResource.parsedURL.securityOrigin);
    if (observedResponseTime === undefined) throw new Error('No response time for origin');

    // Estimate when the connection is not warm.
    // TTFB = DNS + (SSL)? + TCP handshake + 1 RT for request + server response time
    let roundTrips = 2;
    if (!mainResource.protocol.startsWith('h3')) roundTrips += 1; // TCP
    if (mainResource.parsedURL.scheme === 'https') roundTrips += 1;
    const estimatedTTFB = data.settings.throttling.rttMs * roundTrips + observedResponseTime;

    const timing = Math.max(observedTTFB, estimatedTTFB);
    return {timing};
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data, context) {
    const {trace, settings, SourceMaps, HostDPR} = data;
    const traceEngineResult =
      await TraceEngineResult.request({trace, settings, SourceMaps, HostDPR}, context);
    const navInsights =
      await NavigationInsights.request({trace, settings, SourceMaps, HostDPR}, context);
    const lcpBreakdown = navInsights.model.LCPBreakdown;

    // Defer to LCP breakdown, but if there's no LCP fallback to manual calculation.
    if (!(lcpBreakdown instanceof Error) && lcpBreakdown.subparts) {
      return {
        timing: lcpBreakdown.subparts.ttfb.range / 1000,
        timestamp: lcpBreakdown.subparts.ttfb.max,
      };
    } else if (navInsights.navigation?.args.data?.navigationId) {
      const request = traceEngineResult.data.NetworkRequests.byId.get(
        navInsights.navigation.args.data.navigationId);
      if (!request) {
        throw new Error();
      }

      const timestamp = calculateDocFirstByteTs(request);
      if (timestamp === null) {
        throw new Error('cannot calculate ttfb');
      }

      return {
        timing: (timestamp - navInsights.navigation.ts) / 1000,
        timestamp,
      };
    }

    throw new Error('cannot determine ttfb');
  }
}

const TimeToFirstByteComputed = makeComputedArtifact(
  TimeToFirstByte,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps', 'HostDPR']
);
export {TimeToFirstByteComputed as TimeToFirstByte};
