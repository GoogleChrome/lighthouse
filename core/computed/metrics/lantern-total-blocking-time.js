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
   * @param {Lantern.Simulation.Result} simulation
   * @param {Lantern.Metrics.Extras} extras
   * @return {Lantern.Metrics.MetricResult}
   */
  static getEstimateFromSimulation(simulation, extras) {
    if (!extras.fcpResult) {
      throw new Lantern.Core.LanternError('missing fcpResult');
    }
    if (!extras.interactiveResult) {
      throw new Lantern.Core.LanternError('missing interactiveResult');
    }

    const fcpTimeInMs = extras.optimistic ? extras.fcpResult.pessimisticEstimate.timeInMs :
        extras.fcpResult.optimisticEstimate.timeInMs;
    const interactiveTimeMs = extras.optimistic ? extras.interactiveResult.optimisticEstimate.timeInMs :
        extras.interactiveResult.pessimisticEstimate.timeInMs;

    const minDurationMs = Lantern.Metrics.TBTUtils.BLOCKING_TIME_THRESHOLD;

    const events = [];
    for (const [node, timing] of simulation.nodeTimings.entries()) {
      if (node.type !== 'cpu') continue;

      let durationToUse = timing.duration;

      // If a task is bounded by a yield, it's highly likely the developer is chunking.
      // We assume time-based chunking, so the unthrottled duration is a better representation
      // of how long it will block on a slower device.
      // See: https://github.com/GoogleChrome/lighthouse/issues/16183
      const isYieldBounded = node.childEvents?.some(e => {
        return e.name === 'ScheduleYieldContinuation' ||
               e.name === 'RunYieldContinuation' ||
               e.name === 'SchedulePostTaskCallback' ||
               e.name === 'RunPostTaskCallback';
      });

      if (isYieldBounded) {
        durationToUse = node.duration / 1000;
      }

      if (durationToUse < minDurationMs) continue;

      events.push({
        start: timing.startTime,
        end: timing.endTime,
        duration: timing.duration,
      });
    }

    return {
      timeInMs: Lantern.Metrics.TBTUtils.calculateSumOfBlockingTime(
        events, fcpTimeInMs, interactiveTimeMs),
      nodeTimings: simulation.nodeTimings,
    };
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
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL', 'SourceMaps', 'HostDPR']
);
export {LanternTotalBlockingTimeComputed as LanternTotalBlockingTime};
