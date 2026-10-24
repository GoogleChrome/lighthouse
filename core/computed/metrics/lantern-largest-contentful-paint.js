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
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @param {Omit<Lantern.Metrics.Extras, 'optimistic'>=} extras
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async computeMetricWithGraphs(data, context, extras) {
    const params = await getComputationDataParams(data, context);
    try {
      const result = this.compute(params, extras);
      const estimatesByLabel = /** @type {const} */ ([
        ['optimisticLargestContentfulPaint', result.optimisticEstimate],
        ['pessimisticLargestContentfulPaint', result.pessimisticEstimate],
      ]);
      for (const [label, estimate] of estimatesByLabel) {
        const completeNodeTimings = Lantern.Simulation.Simulator.allNodeTimings.get(label);
        if (!completeNodeTimings) continue;
        for (const [node, timing] of estimate.nodeTimings.entries()) {
          const completeTiming = completeNodeTimings.get(node);
          if (completeTiming) {
            Object.assign(timing, {queuedTime: completeTiming.queuedTime});
          }
        }
      }
      return result;
    } catch (err) {
      return lanternErrorAdapter(err);
    }
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
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps', 'HostDPR']
);
export {LanternLargestContentfulPaintComputed as LanternLargestContentfulPaint};
