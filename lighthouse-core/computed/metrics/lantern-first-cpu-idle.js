/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const BaseNode = require('../../lib/dependency-graph/base-node.js');
const LanternInteractive = require('./lantern-interactive.js');

class LanternFirstCPUIdle extends LanternInteractive {
  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 1,
      pessimistic: 0,
    };
  }


  /**
   * @param {LH.Gatherer.Simulation.Result} simulation
   * @param {{optimistic: boolean, fmpResult: LH.Artifacts.LanternMetric}} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  static getEstimateFromSimulation(simulation, extras) {
    const fmpTimeInMs = extras.optimistic
      ? extras.fmpResult.optimisticEstimate.timeInMs
      : extras.fmpResult.pessimisticEstimate.timeInMs;

    return {
      timeInMs: LanternFirstCPUIdle.getFirstCPUIdleWindowStart(simulation.nodeTimings, fmpTimeInMs),
      nodeTimings: simulation.nodeTimings,
    };
  }

  /**
   *
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fmpTimeInMs
   */
  static getFirstCPUIdleWindowStart(nodeTimings, fmpTimeInMs, longTaskLength = 50) {
    /** @type {Array<{start: number, end: number}>} */
    const longTasks = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== BaseNode.TYPES.CPU) continue;
      if (timing.duration < longTaskLength) continue;
      longTasks.push({start: timing.startTime, end: timing.endTime});
    }

    longTasks.sort((a, b) => a.start - b.start);
    // Require here to resolve circular dependency.
    const FirstCPUIdle = require('./first-cpu-idle.js');
    return FirstCPUIdle.findQuietWindow(fmpTimeInMs, Infinity, longTasks);
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    return super.compute_(data, context);
  }
}

module.exports = makeComputedArtifact(LanternFirstCPUIdle);
