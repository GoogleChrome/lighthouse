/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/lantern.js';
import {makeComputedArtifact} from '../computed-artifact.js';
import {LanternFirstContentfulPaint} from './lantern-first-contentful-paint.js';
import {LanternInteractive} from './lantern-interactive.js';
import {getComputationDataParams} from './lantern-metric.js';

class LanternTotalBlockingTime extends Lantern.Metrics.TotalBlockingTime {
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @param {Omit<Lantern.Metrics.Extras, 'optimistic'>=} extras
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
    const interactiveResult = await LanternInteractive.request(data, context);
    return this.computeMetricWithGraphs(data, context, {fcpResult, interactiveResult});
  }
}

const LanternTotalBlockingTimeComputed = makeComputedArtifact(
  LanternTotalBlockingTime,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps']
);
export {LanternTotalBlockingTimeComputed as LanternTotalBlockingTime};
