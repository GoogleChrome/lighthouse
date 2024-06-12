/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {LargestContentfulPaint} from '../../lib/lantern/metrics/LargestContentfulPaint.js';
import {getComputationDataParams, lanternErrorAdapter} from './lantern-metric.js';
import {LanternFirstContentfulPaint} from './lantern-first-contentful-paint.js';

/** @typedef {import('../../lib/lantern/Metric.js').Extras} Extras */

class LanternLargestContentfulPaint extends LargestContentfulPaint {
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

const LanternLargestContentfulPaintComputed = makeComputedArtifact(
  LanternLargestContentfulPaint,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {LanternLargestContentfulPaintComputed as LanternLargestContentfulPaint};
