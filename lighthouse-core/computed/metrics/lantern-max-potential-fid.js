/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const LanternMetricArtifact = require('./lantern-metric.js');
const BaseNode = require('../../lib/dependency-graph/base-node.js');
const LanternFirstContentfulPaint = require('./lantern-first-contentful-paint.js');

/** @typedef {BaseNode.Node} Node */

class LanternMaxPotentialFID extends LanternMetricArtifact {
  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
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
   * @param {LH.Gatherer.Simulation.Result} simulation
   * @param {import('./lantern-metric.js').Extras} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  static getEstimateFromSimulation(simulation, extras) {
    if (!extras.fcpResult) throw new Error('missing fcpResult');

    // Intentionally use the opposite FCP estimate, a more pessimistic FCP means that more tasks
    // are excluded from the FID computation, so a higher FCP means lower FID for same work.
    const fcpTimeInMs = extras.optimistic
      ? extras.fcpResult.pessimisticEstimate.timeInMs
      : extras.fcpResult.optimisticEstimate.timeInMs;

    const timings = LanternMaxPotentialFID.getTimingsAfterFCP(
      simulation.nodeTimings,
      fcpTimeInMs
    );

    return {
      timeInMs: Math.max(...timings.map(timing => timing.duration), 16),
      nodeTimings: simulation.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    const fcpResult = await LanternFirstContentfulPaint.request(data, context);
    return super.computeMetricWithGraphs(data, context, {fcpResult});
  }

  /**
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fcpTimeInMs
   * @return {Array<{duration: number}>}
   */
  static getTimingsAfterFCP(nodeTimings, fcpTimeInMs) {
    return Array.from(nodeTimings.entries())
      .filter(([node, timing]) => node.type === BaseNode.TYPES.CPU && timing.endTime > fcpTimeInMs)
      .map(([_, timing]) => timing);
  }
}

module.exports = makeComputedArtifact(LanternMaxPotentialFID);
