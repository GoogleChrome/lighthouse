/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

/** @typedef {import('../BaseNode.js').Node} Node */

class MaxPotentialFID extends Lantern.Metric {
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

    // Intentionally use the opposite FCP estimate, a more pessimistic FCP means that more tasks
    // are excluded from the FID computation, so a higher FCP means lower FID for same work.
    const fcpTimeInMs = extras.optimistic
      ? extras.fcpResult.pessimisticEstimate.timeInMs
      : extras.fcpResult.optimisticEstimate.timeInMs;

    const timings = MaxPotentialFID.getTimingsAfterFCP(
      simulation.nodeTimings,
      fcpTimeInMs
    );

    return {
      timeInMs: Math.max(...timings.map(timing => timing.duration), 16),
      nodeTimings: simulation.nodeTimings,
    };
  }

  /**
   * @param {Lantern.Simulation.MetricComputationDataInput} data
   * @param {Omit<import('../Metric.js').Extras, 'optimistic'>=} extras
   * @return {Promise<Lantern.Metrics.Result>}
   */
  static compute(data, extras) {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Error('FCP is required to calculate the Max Potential FID metric');
    }

    return super.compute(data, extras);
  }

  /**
   * @param {Lantern.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fcpTimeInMs
   * @return {Array<{duration: number}>}
   */
  static getTimingsAfterFCP(nodeTimings, fcpTimeInMs) {
    return Array.from(nodeTimings.entries())
      .filter(([node, timing]) =>
        node.type === Lantern.BaseNode.TYPES.CPU && timing.endTime > fcpTimeInMs)
      .map(([_, timing]) => timing);
  }
}

export {MaxPotentialFID};
