/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';
import {MainResource} from '../main-resource.js';
import {NetworkAnalysis} from '../network-analysis.js';

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
    const mainResource = await MainResource.request(data, context);
    if (!mainResource.timing) {
      throw new Error('missing timing for main resource');
    }

    const {processedNavigation} = data;
    const timeOriginTs = processedNavigation.timestamps.timeOrigin;
    const timestampMs =
      mainResource.timing.requestTime * 1000 + mainResource.timing.receiveHeadersStart;
    const timestamp = timestampMs * 1000;
    const timing = (timestamp - timeOriginTs) / 1000;
    return {timing, timestamp};
  }
}

const TimeToFirstByteComputed = makeComputedArtifact(
  TimeToFirstByte,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {TimeToFirstByteComputed as TimeToFirstByte};
