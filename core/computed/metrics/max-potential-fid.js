/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';
import {LanternMaxPotentialFID} from './lantern-max-potential-fid.js';
import {TraceProcessor} from '../../lib/tracehouse/trace-processor.js';

class MaxPotentialFID extends NavigationMetric {
  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    const metricData = NavigationMetric.getMetricComputationInput(data);
    return LanternMaxPotentialFID.request(metricData, context);
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data) {
    const {firstContentfulPaint} = data.processedNavigation.timings;

    const events = TraceProcessor.getMainThreadTopLevelEvents(
      data.processedTrace,
      firstContentfulPaint
    ).filter(evt => evt.duration >= 1);

    return Promise.resolve({
      timing: Math.max(...events.map(evt => evt.duration), 16),
    });
  }
}

const MaxPotentialFIDComputed = makeComputedArtifact(
  MaxPotentialFID,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps']
);
export {MaxPotentialFIDComputed as MaxPotentialFID};
