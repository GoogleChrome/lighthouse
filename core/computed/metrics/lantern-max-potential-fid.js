/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/lantern.js';
import {makeComputedArtifact} from '../computed-artifact.js';
import {getComputationDataParams, lanternErrorAdapter} from './lantern-metric.js';
import {LanternFirstContentfulPaint} from './lantern-first-contentful-paint.js';

/** @typedef {import('../../lib/lantern/Metric.js').Extras} Extras */

class LanternMaxPotentialFID extends Lantern.Metrics.MaxPotentialFID {
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @param {Omit<Extras, 'optimistic'>=} extras
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async computeMetricWithGraphs(data, context, extras) {
    return this.compute(await getComputationDataParams(data, context), extras)
      .catch(lanternErrorAdapter);
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    const fcpResult = await LanternFirstContentfulPaint.request(data, context);
    return this.computeMetricWithGraphs(data, context, {fcpResult});
  }
}

const LanternMaxPotentialFIDComputed = makeComputedArtifact(
  LanternMaxPotentialFID,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {LanternMaxPotentialFIDComputed as LanternMaxPotentialFID};
