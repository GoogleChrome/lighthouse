/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';
import {LanternSpeedIndex} from './lantern-speed-index.js';
import {Speedline} from '../speedline.js';

class SpeedIndex extends NavigationMetric {
  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    const metricData = NavigationMetric.getMetricComputationInput(data);
    return LanternSpeedIndex.request(metricData, context);
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data, context) {
    const speedline = await Speedline.request(data.trace, context);
    const timing = Math.round(speedline.speedIndex);
    const timestamp = (timing + speedline.beginning) * 1000;
    return Promise.resolve({timing, timestamp});
  }
}

const SpeedIndexComputed = makeComputedArtifact(
  SpeedIndex,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {SpeedIndexComputed as SpeedIndex};
