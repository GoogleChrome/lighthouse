/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const LanternMetric = require('./lantern-metric.js');
const BaseNode = require('../../lib/dependency-graph/base-node.js');
const Speedline = require('../speedline.js');
const LanternFirstContentfulPaint = require('./lantern-first-contentful-paint.js');
const defaultThrottling = require('../../config/constants.js').throttling;

/** @typedef {BaseNode.Node} Node */

class LanternSpeedIndex extends LanternMetric {
  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    return {
      // Negative intercept is OK because estimate is Math.max(FCP, Speed Index) and
      // the optimistic estimate is based on the real observed speed index rather than a real
      // lantern graph.
      intercept: -250,
      optimistic: 1.4,
      pessimistic: 0.65,
    };
  }

  /**
   * @param {number} rttMs
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  static getScaledCoefficients(rttMs) { // eslint-disable-line no-unused-vars
    // We want to scale our default coefficients based on the speed of the connection.
    // We will linearly interpolate coefficients for the passed-in rttMs based on two pre-determined points:
    //   1. Baseline point of 30 ms RTT where Speed Index should be a ~50/50 blend of optimistic/pessimistic.
    //      30 ms was based on a typical home WiFi connection's actual RTT.
    //      Coefficients here follow from the fact that the optimistic estimate should be very close
    //      to reality at this connection speed and the pessimistic estimate compensates for minor
    //      connection speed differences.
    //   2. Default throttled point of 150 ms RTT where the default coefficients have been determined to be most accurate.
    //      Coefficients here were determined through thorough analysis and linear regression on the
    //      lantern test data set. See lighthouse-core/scripts/test-lantern.sh for more detail.
    // While the coefficients haven't been analyzed at the interpolated points, it's our current best effort.
    const defaultCoefficients = this.COEFFICIENTS;
    const defaultRttExcess = defaultThrottling.mobileSlow4G.rttMs - 30;
    const multiplier = Math.max((rttMs - 30) / defaultRttExcess, 0);

    return {
      intercept: defaultCoefficients.intercept * multiplier,
      optimistic: 0.5 + (defaultCoefficients.optimistic - 0.5) * multiplier,
      pessimistic: 0.5 + (defaultCoefficients.pessimistic - 0.5) * multiplier,
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
   * @param {LH.Gatherer.Simulation.Result} simulationResult
   * @param {import('./lantern-metric.js').Extras} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  static getEstimateFromSimulation(simulationResult, extras) {
    if (!extras.fcpResult) throw new Error('missing fcpResult');
    if (!extras.speedline) throw new Error('missing speedline');

    const fcpTimeInMs = extras.fcpResult.pessimisticEstimate.timeInMs;
    const estimate = extras.optimistic
      ? extras.speedline.speedIndex
      : LanternSpeedIndex.computeLayoutBasedSpeedIndex(simulationResult.nodeTimings, fcpTimeInMs);
    return {
      timeInMs: estimate,
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    const speedline = await Speedline.request(data.trace, context);
    const fcpResult = await LanternFirstContentfulPaint.request(data, context);
    const metricResult = await this.computeMetricWithGraphs(data, context, {
      speedline,
      fcpResult,
    });
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }

  /**
   * Approximate speed index using layout events from the simulated node timings.
   * The layout-based speed index is the weighted average of the endTime of CPU nodes that contained
   * a 'Layout' task. log(duration) is used as the weight to stand for "significance" to the page.
   *
   * If no layout events can be found or the endTime of a CPU task is too early, FCP is used instead.
   *
   * This approach was determined after evaluating the accuracy/complexity tradeoff of many
   * different methods. Read more in the evaluation doc.
   *
   * @see https://docs.google.com/document/d/1qJWXwxoyVLVadezIp_Tgdk867G3tDNkkVRvUJSH3K1E/edit#
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fcpTimeInMs
   * @return {number}
   */
  static computeLayoutBasedSpeedIndex(nodeTimings, fcpTimeInMs) {
    /** @type {Array<{time: number, weight: number}>} */
    const layoutWeights = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== BaseNode.TYPES.CPU) continue;

      if (node.childEvents.some(x => x.name === 'Layout')) {
        const timingWeight = Math.max(Math.log2(timing.endTime - timing.startTime), 0);
        layoutWeights.push({time: timing.endTime, weight: timingWeight});
      }
    }

    if (!layoutWeights.length) {
      return fcpTimeInMs;
    }

    const totalWeightedTime = layoutWeights
      .map(evt => evt.weight * Math.max(evt.time, fcpTimeInMs))
      .reduce((a, b) => a + b, 0);
    const totalWeight = layoutWeights.map(evt => evt.weight).reduce((a, b) => a + b, 0);
    return totalWeightedTime / totalWeight;
  }
}

module.exports = makeComputedArtifact(LanternSpeedIndex);
