/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/lantern.js';
import {makeComputedArtifact} from '../computed-artifact.js';
import {getComputationDataParams, lanternErrorAdapter} from './lantern-metric.js';
import {LanternFirstContentfulPaint} from './lantern-first-contentful-paint.js';

class LanternLargestContentfulPaint extends Lantern.Metrics.LargestContentfulPaint {
  static disableFcpShortCircuiting = false;

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @param {Required<Pick<Lantern.Metrics.Extras, 'fcpResult'>>} extras
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async computeMetricWithGraphs(data, context, extras) {
    const params = await getComputationDataParams(data, context);
    // If FCP and LCP happened within the same frame, we can assume their simulated values
    // are also the same.
    if (
      params.processedNavigation.timestamps.firstContentfulPaint ===
        params.processedNavigation.timestamps.largestContentfulPaint &&
        !this.disableFcpShortCircuiting
    ) {
      return extras.fcpResult;
    }
    return Promise.resolve(this.compute(params, extras)).catch(lanternErrorAdapter);
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

  /**
   * Designed to be used solely in tests.
   *
   * @param {() => Promise<LH.Artifacts.LanternMetric>} callback
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async withFcpShortCircuitDisabled(callback) {
    this.disableFcpShortCircuiting = true;
    try {
      return await callback();
    } finally {
      this.disableFcpShortCircuiting = false;
    }
  }
}

const LanternLargestContentfulPaintComputed = makeComputedArtifact(
  LanternLargestContentfulPaint,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps', 'HostDPR']
);
export {LanternLargestContentfulPaintComputed as LanternLargestContentfulPaint};
