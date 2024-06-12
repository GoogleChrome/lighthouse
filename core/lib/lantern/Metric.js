/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from './lantern.js';

/** @typedef {import('./BaseNode.js').Node} Node */
/** @typedef {import('./NetworkNode.js').NetworkNode} NetworkNode */
/** @typedef {import('./simulation/Simulator.js').Simulator} Simulator */

/**
 * @typedef Extras
 * @property {boolean} optimistic
 * @property {Lantern.Metrics.Result=} fcpResult
 * @property {Lantern.Metrics.Result=} lcpResult
 * @property {Lantern.Metrics.Result=} interactiveResult
 * @property {number=} observedSpeedIndex
 */

class Metric {
  /**
   * @param {Node} dependencyGraph
   * @param {function(NetworkNode):boolean=} treatNodeAsRenderBlocking
   * @return {Set<string>}
   */
  static getScriptUrls(dependencyGraph, treatNodeAsRenderBlocking) {
    /** @type {Set<string>} */
    const scriptUrls = new Set();

    dependencyGraph.traverse(node => {
      if (node.type !== Lantern.BaseNode.TYPES.NETWORK) return;
      if (node.request.resourceType !== Lantern.NetworkRequestTypes.Script) return;
      if (treatNodeAsRenderBlocking?.(node)) {
        scriptUrls.add(node.request.url);
      }
    });

    return scriptUrls;
  }

  /**
   * @return {Lantern.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    throw new Error('COEFFICIENTS unimplemented!');
  }

  /**
   * Returns the coefficients, scaled by the throttling settings if needed by the metric.
   * Some lantern metrics (speed-index) use components in their estimate that are not
   * from the simulator. In this case, we need to adjust the coefficients as the target throttling
   * settings change.
   *
   * @param {number} rttMs
   * @return {Lantern.Simulation.MetricCoefficients}
   */
  static getScaledCoefficients(rttMs) { // eslint-disable-line no-unused-vars
    return this.COEFFICIENTS;
  }

  /**
   * @param {Node} dependencyGraph
   * @param {Lantern.Simulation.ProcessedNavigation} processedNavigation
   * @return {Node}
   */
  static getOptimisticGraph(dependencyGraph, processedNavigation) { // eslint-disable-line no-unused-vars
    throw new Error('Optimistic graph unimplemented!');
  }

  /**
   * @param {Node} dependencyGraph
   * @param {Lantern.Simulation.ProcessedNavigation} processedNavigation
   * @return {Node}
   */
  static getPessimisticGraph(dependencyGraph, processedNavigation) { // eslint-disable-line no-unused-vars
    throw new Error('Pessmistic graph unimplemented!');
  }

  /**
   * @param {Lantern.Simulation.Result} simulationResult
   * @param {Extras} extras
   * @return {Lantern.Simulation.Result}
   */
  static getEstimateFromSimulation(simulationResult, extras) { // eslint-disable-line no-unused-vars
    return simulationResult;
  }

  /**
   * @param {Lantern.Simulation.MetricComputationDataInput} data
   * @param {Omit<Extras, 'optimistic'>=} extras
   * @return {Promise<Lantern.Metrics.Result>}
   */
  static async compute(data, extras) {
    const {simulator, graph, processedNavigation} = data;

    const metricName = this.name.replace('Lantern', '');
    const optimisticGraph = this.getOptimisticGraph(graph, processedNavigation);
    const pessimisticGraph = this.getPessimisticGraph(graph, processedNavigation);

    let simulateOptions = {label: `optimistic${metricName}`};
    const optimisticSimulation = simulator.simulate(optimisticGraph, simulateOptions);

    simulateOptions = {label: `pessimistic${metricName}`};
    const pessimisticSimulation = simulator.simulate(pessimisticGraph, simulateOptions);

    const optimisticEstimate = this.getEstimateFromSimulation(
      optimisticSimulation,
      {...extras, optimistic: true}
    );

    const pessimisticEstimate = this.getEstimateFromSimulation(
      pessimisticSimulation,
      {...extras, optimistic: false}
    );

    const coefficients = this.getScaledCoefficients(simulator.rtt);
    // Estimates under 1s don't really follow the normal curve fit, minimize the impact of the intercept
    const interceptMultiplier = coefficients.intercept > 0 ?
      Math.min(1, optimisticEstimate.timeInMs / 1000) : 1;
    const timing =
      coefficients.intercept * interceptMultiplier +
      coefficients.optimistic * optimisticEstimate.timeInMs +
      coefficients.pessimistic * pessimisticEstimate.timeInMs;

    return {
      timing,
      optimisticEstimate,
      pessimisticEstimate,
      optimisticGraph,
      pessimisticGraph,
    };
  }
}

export {Metric};
