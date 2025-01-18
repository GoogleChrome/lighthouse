/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';

class FirstContentfulPaintAllFrames extends NavigationMetric {
  /**
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric() {
    // TODO: Add support for all frames in lantern.
    throw new Error('FCP All Frames not implemented in lantern');
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data) {
    const {processedNavigation} = data;

    return {
      timing: processedNavigation.timings.firstContentfulPaintAllFrames,
      timestamp: processedNavigation.timestamps.firstContentfulPaintAllFrames,
    };
  }
}

const FirstContentfulPaintAllFramesComputed = makeComputedArtifact(
  FirstContentfulPaintAllFrames,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {FirstContentfulPaintAllFramesComputed as FirstContentfulPaintAllFrames};
