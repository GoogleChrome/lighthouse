/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/lantern.js';
import {makeComputedArtifact} from '../computed-artifact.js';
import {getComputationDataParams, lanternErrorAdapter} from './lantern-metric.js';

class LanternFirstContentfulPaint extends Lantern.Metrics.FirstContentfulPaint {
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
    return this.computeMetricWithGraphs(data, context);
  }
}

const LanternFirstContentfulPaintComputed = makeComputedArtifact(
  LanternFirstContentfulPaint,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {LanternFirstContentfulPaintComputed as LanternFirstContentfulPaint};
