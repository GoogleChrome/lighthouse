/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BaseNode = require('../../lib/dependency-graph/base-node.js');
const NetworkRequest = require('../../lib/network-request.js');
const TraceOfTab = require('../trace-of-tab.js');
const PageDependencyGraph = require('../page-dependency-graph.js');
const LoadSimulator = require('../load-simulator.js');

/** @typedef {BaseNode.Node} Node */
/** @typedef {import('../../lib/dependency-graph/network-node')} NetworkNode */
/** @typedef {import('../../lib/dependency-graph/simulator/simulator')} Simulator */

/**
 * @typedef Extras
 * @property {boolean} optimistic
 * @property {LH.Artifacts.LanternMetric=} fcpResult
 * @property {LH.Artifacts.LanternMetric=} fmpResult
 * @property {LH.Artifacts.LanternMetric=} interactiveResult
 * @property {{speedIndex: number}=} speedline
 */

class LanternMetricArtifact {
  /**
   * @param {Node} dependencyGraph
   * @param {function(NetworkNode):boolean=} condition
   * @return {Set<string>}
   */
  static getScriptUrls(dependencyGraph, condition) {
    /** @type {Set<string>} */
    const scriptUrls = new Set();

    dependencyGraph.traverse(node => {
      if (node.type === BaseNode.TYPES.CPU) return;
      if (node.record.resourceType !== NetworkRequest.TYPES.Script) return;
      if (condition && !condition(node)) return;
      scriptUrls.add(node.record.url);
    });

    return scriptUrls;
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
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
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  static getScaledCoefficients(rttMs) { // eslint-disable-line no-unused-vars
    return this.COEFFICIENTS;
  }

  /**
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.TraceOfTab} traceOfTab
   * @return {Node}
   */
  static getOptimisticGraph(dependencyGraph, traceOfTab) { // eslint-disable-line no-unused-vars
    throw new Error('Optimistic graph unimplemented!');
  }

  /**
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.TraceOfTab} traceOfTab
   * @return {Node}
   */
  static getPessimisticGraph(dependencyGraph, traceOfTab) { // eslint-disable-line no-unused-vars
    throw new Error('Pessmistic graph unimplemented!');
  }

  /**
   * @param {LH.Gatherer.Simulation.Result} simulationResult
   * @param {Extras} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  static getEstimateFromSimulation(simulationResult, extras) { // eslint-disable-line no-unused-vars
    return simulationResult;
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @param {Omit<Extras, 'optimistic'>=} extras
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async computeMetricWithGraphs(data, context, extras) {
    const {trace, devtoolsLog, settings} = data;
    const metricName = this.name.replace('Lantern', '');
    const graph = await PageDependencyGraph.request({trace, devtoolsLog}, context);
    const traceOfTab = await TraceOfTab.request(trace, context);
    const simulator = data.simulator ||
        await LoadSimulator.request({devtoolsLog, settings}, context);

    const optimisticGraph = this.getOptimisticGraph(graph, traceOfTab);
    const pessimisticGraph = this.getPessimisticGraph(graph, traceOfTab);

    /** @type {{flexibleOrdering?: boolean, label?: string}} */
    let simulateOptions = {label: `optimistic${metricName}`};
    const optimisticSimulation = simulator.simulate(optimisticGraph, simulateOptions);

    simulateOptions = {label: `optimisticFlex${metricName}`, flexibleOrdering: true};
    const optimisticFlexSimulation = simulator.simulate(optimisticGraph, simulateOptions);

    simulateOptions = {label: `pessimistic${metricName}`};
    const pessimisticSimulation = simulator.simulate(pessimisticGraph, simulateOptions);

    const optimisticEstimate = this.getEstimateFromSimulation(
      optimisticSimulation.timeInMs < optimisticFlexSimulation.timeInMs ?
        optimisticSimulation : optimisticFlexSimulation, {...extras, optimistic: true}
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

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    return this.computeMetricWithGraphs(data, context);
  }
}

module.exports = LanternMetricArtifact;
