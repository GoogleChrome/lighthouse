/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

/** @typedef {import('../BaseNode.js').Node} Node */

class TotalBlockingTime extends Lantern.Metric {
  /**
   * @return {Lantern.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5,
    };
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  static getOptimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  static getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {Lantern.Simulation.Result} simulation
   * @param {import('../Metric.js').Extras} extras
   * @return {Lantern.Simulation.Result}
   */
  static getEstimateFromSimulation(simulation, extras) {
    if (!extras.fcpResult) throw new Error('missing fcpResult');
    if (!extras.interactiveResult) throw new Error('missing interactiveResult');

    // Intentionally use the opposite FCP estimate. A pessimistic FCP is higher than equal to an
    // optimistic FCP, which means potentially more tasks are excluded from the Total Blocking Time
    // computation. So a more pessimistic FCP gives a more optimistic Total Blocking Time for the
    // same work.
    const fcpTimeInMs = extras.optimistic
      ? extras.fcpResult.pessimisticEstimate.timeInMs
      : extras.fcpResult.optimisticEstimate.timeInMs;

    // Similarly, we always have pessimistic TTI >= optimistic TTI. Therefore, picking optimistic
    // TTI means our window of interest is smaller and thus potentially more tasks are excluded from
    // Total Blocking Time computation, yielding a lower (more optimistic) Total Blocking Time value
    // for the same work.
    const interactiveTimeMs = extras.optimistic
      ? extras.interactiveResult.optimisticEstimate.timeInMs
      : extras.interactiveResult.pessimisticEstimate.timeInMs;

    const minDurationMs = Lantern.TBTUtils.BLOCKING_TIME_THRESHOLD;

    const events = TotalBlockingTime.getTopLevelEvents(
      simulation.nodeTimings,
      minDurationMs
    );

    return {
      timeInMs: Lantern.TBTUtils.calculateSumOfBlockingTime(
        events,
        fcpTimeInMs,
        interactiveTimeMs
      ),
      nodeTimings: simulation.nodeTimings,
    };
  }

  /**
   * @param {Lantern.Simulation.MetricComputationDataInput} data
   * @param {Omit<import('../Metric.js').Extras, 'optimistic'>=} extras
   * @return {Promise<Lantern.Metrics.Result>}
   */
  static async compute(data, extras) {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Error('FCP is required to calculate the TBT metric');
    }

    const interactiveResult = extras?.fcpResult;
    if (!interactiveResult) {
      throw new Error('Interactive is required to calculate the TBT metric');
    }

    return super.compute(data, extras);
  }

  /**
   * @param {Lantern.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} minDurationMs
   */
  static getTopLevelEvents(nodeTimings, minDurationMs) {
    /** @type {Array<{start: number, end: number, duration: number}>}
     */
    const events = [];

    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== Lantern.BaseNode.TYPES.CPU) continue;
      // Filtering out events below minimum duration.
      if (timing.duration < minDurationMs) continue;

      events.push({
        start: timing.startTime,
        end: timing.endTime,
        duration: timing.duration,
      });
    }

    return events;
  }
}

export {TotalBlockingTime};
