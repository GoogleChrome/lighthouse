/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/lantern.js';
import {makeComputedArtifact} from '../computed-artifact.js';
import {getComputationDataParams, lanternErrorAdapter} from './lantern-metric.js';
import {Speedline} from '../speedline.js';
import {LanternFirstContentfulPaint} from './lantern-first-contentful-paint.js';

class LanternSpeedIndex extends Lantern.Metrics.SpeedIndex {
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @param {Omit<Lantern.Metrics.Extras, 'optimistic'>=} extras
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async computeMetricWithGraphs(data, context, extras) {
    const params = await getComputationDataParams(data, context);
    return Promise.resolve(this.compute(params, extras)).catch(lanternErrorAdapter);
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    // TODO(15841): lib/lantern should probably run Speedline
    const speedline = await Speedline.request(data.trace, context);
    const fcpResult = await LanternFirstContentfulPaint.request(data, context);
    return this.computeMetricWithGraphs(data, context, {
      observedSpeedIndex: speedline.speedIndex,
      fcpResult,
    });
  }
}

const LanternSpeedIndexComputed = makeComputedArtifact(
  LanternSpeedIndex,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps']
);
export {LanternSpeedIndexComputed as LanternSpeedIndex};
