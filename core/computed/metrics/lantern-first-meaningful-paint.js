/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {getComputationDataParams} from './lantern-metric.js';
import {FirstMeaningfulPaint} from '../../lib/lantern/metrics/first-meaningful-paint.js';
import {LanternFirstContentfulPaint} from './lantern-first-contentful-paint.js';

/** @typedef {import('../../lib/lantern/metric.js').Extras} Extras */

class LanternFirstMeaningfulPaint extends FirstMeaningfulPaint {
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
    const fcpResult = await LanternFirstContentfulPaint.request(data, context);
    const metricResult = await this.computeMetricWithGraphs(data, context);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
}

const LanternFirstMeaningfulPaintComputed = makeComputedArtifact(
  LanternFirstMeaningfulPaint,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {LanternFirstMeaningfulPaintComputed as LanternFirstMeaningfulPaint};
