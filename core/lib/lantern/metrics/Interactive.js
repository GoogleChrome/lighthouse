/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

/** @typedef {import('../BaseNode.js').Node} Node */

// Any CPU task of 20 ms or more will end up being a critical long task on mobile
const CRITICAL_LONG_TASK_THRESHOLD = 20;

class Interactive extends Lantern.Metric {
  /**
   * @return {Lantern.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 0.45,
      pessimistic: 0.55,
    };
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  static getOptimisticGraph(dependencyGraph) {
    // Adjust the critical long task threshold for microseconds
    const minimumCpuTaskDuration = CRITICAL_LONG_TASK_THRESHOLD * 1000;

    return dependencyGraph.cloneWithRelationships(node => {
      // Include everything that might be a long task
      if (node.type === Lantern.BaseNode.TYPES.CPU) {
        return node.duration > minimumCpuTaskDuration;
      }

      // Include all scripts and high priority requests, exclude all images
      const isImage = node.request.resourceType === Lantern.NetworkRequestTypes.Image;
      const isScript = node.request.resourceType === Lantern.NetworkRequestTypes.Script;
      return (
        !isImage &&
        (isScript ||
          node.request.priority === 'High' ||
          node.request.priority === 'VeryHigh')
      );
    });
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  static getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {Lantern.Simulation.Result} simulationResult
   * @param {import('../Metric.js').Extras} extras
   * @return {Lantern.Simulation.Result}
   */
  static getEstimateFromSimulation(simulationResult, extras) {
    if (!extras.lcpResult) throw new Error('missing lcpResult');

    const lastTaskAt = Interactive.getLastLongTaskEndTime(simulationResult.nodeTimings);
    const minimumTime = extras.optimistic
      ? extras.lcpResult.optimisticEstimate.timeInMs
      : extras.lcpResult.pessimisticEstimate.timeInMs;
    return {
      timeInMs: Math.max(minimumTime, lastTaskAt),
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  /**
   * @param {Lantern.Simulation.MetricComputationDataInput} data
   * @param {Omit<import('../Metric.js').Extras, 'optimistic'>=} extras
   * @return {Promise<Lantern.Metrics.Result>}
   */
  static async compute(data, extras) {
    const lcpResult = extras?.lcpResult;
    if (!lcpResult) {
      throw new Error('LCP is required to calculate the Interactive metric');
    }

    const metricResult = await super.compute(data, extras);
    metricResult.timing = Math.max(metricResult.timing, lcpResult.timing);
    return metricResult;
  }

  /**
   * @param {Lantern.Simulation.Result['nodeTimings']} nodeTimings
   * @return {number}
   */
  static getLastLongTaskEndTime(nodeTimings, duration = 50) {
    return Array.from(nodeTimings.entries())
      .filter(([node, timing]) => {
        if (node.type !== Lantern.BaseNode.TYPES.CPU) return false;
        return timing.duration > duration;
      })
      .map(([_, timing]) => timing.endTime)
      .reduce((max, x) => Math.max(max || 0, x || 0), 0);
  }
}

export {Interactive};
