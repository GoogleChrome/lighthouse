/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const LanternMetric = require('./lantern-metric.js');
const BaseNode = require('../../lib/dependency-graph/base-node.js');
const LanternFirstMeaningfulPaint = require('./lantern-first-meaningful-paint.js');

/** @typedef {BaseNode.Node} Node */

class LanternEstimatedInputLatency extends LanternMetric {
  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 0.4,
      pessimistic: 0.4,
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
   * @param {LH.Gatherer.Simulation.Result} simulation
   * @param {import('./lantern-metric.js').Extras} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  static getEstimateFromSimulation(simulation, extras) {
    if (!extras.fmpResult) throw new Error('missing fmpResult');

    // Intentionally use the opposite FMP estimate, a more pessimistic FMP means that more tasks
    // are excluded from the EIL computation, so a higher FMP means lower EIL for same work.
    const fmpTimeInMs = extras.optimistic
      ? extras.fmpResult.pessimisticEstimate.timeInMs
      : extras.fmpResult.optimisticEstimate.timeInMs;

    const events = LanternEstimatedInputLatency.getEventsAfterFMP(
      simulation.nodeTimings,
      fmpTimeInMs
    );

    // Require here to resolve circular dependency.
    const EstimatedInputLatency = require('./estimated-input-latency.js');

    return {
      timeInMs: EstimatedInputLatency.calculateRollingWindowEIL(events),
      nodeTimings: simulation.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    const fmpResult = await LanternFirstMeaningfulPaint.request(data, context);
    return this.computeMetricWithGraphs(data, context, {fmpResult});
  }

  /**
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fmpTimeInMs
   */
  static getEventsAfterFMP(nodeTimings, fmpTimeInMs) {
    /** @type {Array<{start: number, end: number, duration: number}>} */
    const events = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== BaseNode.TYPES.CPU) continue;
      if (timing.endTime < fmpTimeInMs) continue;

      events.push({
        start: timing.startTime,
        end: timing.endTime,
        duration: timing.duration,
      });
    }

    return events.sort((a, b) => a.start - b.start);
  }
}

module.exports = makeComputedArtifact(LanternEstimatedInputLatency);
