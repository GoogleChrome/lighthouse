/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const LanternMetric = require('./lantern-metric.js');
const BaseNode = require('../../lib/dependency-graph/base-node.js');
const LanternFirstContentfulPaint = require('./lantern-first-contentful-paint.js');
const LanternInteractive = require('./lantern-interactive.js');

/** @typedef {BaseNode.Node} Node */

class LanternTotalBlockingTime extends LanternMetric {
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

    // Require here to resolve circular dependency.
    const TotalBlockingTime = require('./total-blocking-time.js');
    const minDurationMs = TotalBlockingTime.BLOCKING_TIME_THRESHOLD;

    const events = LanternTotalBlockingTime.getTopLevelEvents(
      simulation.nodeTimings,
      minDurationMs
    );

    return {
      timeInMs: TotalBlockingTime.calculateSumOfBlockingTime(
        events,
        fcpTimeInMs,
        interactiveTimeMs
      ),
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
    const interactiveResult = await LanternInteractive.request(data, context);
    return this.computeMetricWithGraphs(data, context, {fcpResult, interactiveResult});
  }

  /**
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} minDurationMs
   */
  static getTopLevelEvents(nodeTimings, minDurationMs) {
    /** @type {Array<{start: number, end: number, duration: number}>}
     */
    const events = [];

    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== BaseNode.TYPES.CPU) continue;
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

module.exports = makeComputedArtifact(LanternTotalBlockingTime);
