/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {LanternFirstMeaningfulPaint} from './lantern-first-meaningful-paint.js';
import {Interactive} from '../../lib/lantern/metrics/interactive.js';
import {getComputationDataParams} from './lantern-metric.js';

/** @typedef {import('../../lib/lantern/metric.js').Extras} Extras */

class LanternInteractive extends Interactive {
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @param {Omit<Extras, 'optimistic'>=} extras
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async computeMetricWithGraphs(data, context, extras) {
    return this.compute(await getComputationDataParams(data, context), extras);
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    const fmpResult = await LanternFirstMeaningfulPaint.request(data, context);
    return this.computeMetricWithGraphs(data, context, {fmpResult});
  }
}

const LanternInteractiveComputed = makeComputedArtifact(
  LanternInteractive,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {LanternInteractiveComputed as LanternInteractive};
