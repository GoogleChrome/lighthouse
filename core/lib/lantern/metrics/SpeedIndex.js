/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

const mobileSlow4GRtt = 150;

/** @typedef {import('../BaseNode.js').Node} Node */

class SpeedIndex extends Lantern.Metric {
  /**
   * @return {Lantern.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    return {
      // Note that the optimistic estimate is based on the real observed speed index rather than a
      // real lantern graph (and the final estimate will be Math.max(FCP, Speed Index)).
      intercept: 0,
      optimistic: 1.4,
      pessimistic: 0.4,
    };
  }

  /**
   * @param {number} rttMs
   * @return {Lantern.Simulation.MetricCoefficients}
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
    //      lantern test data set. See core/scripts/test-lantern.sh for more detail.
    // While the coefficients haven't been analyzed at the interpolated points, it's our current best effort.
    const defaultCoefficients = this.COEFFICIENTS;
    const defaultRttExcess = mobileSlow4GRtt - 30;
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
   * @param {Lantern.Simulation.Result} simulationResult
   * @param {import('../Metric.js').Extras} extras
   * @return {Lantern.Simulation.Result}
   */
  static getEstimateFromSimulation(simulationResult, extras) {
    if (!extras.fcpResult) throw new Error('missing fcpResult');
    if (extras.observedSpeedIndex === undefined) throw new Error('missing observedSpeedIndex');

    const fcpTimeInMs = extras.fcpResult.pessimisticEstimate.timeInMs;
    const estimate = extras.optimistic
      ? extras.observedSpeedIndex
      : SpeedIndex.computeLayoutBasedSpeedIndex(simulationResult.nodeTimings, fcpTimeInMs);
    return {
      timeInMs: estimate,
      nodeTimings: simulationResult.nodeTimings,
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
      throw new Error('FCP is required to calculate the SpeedIndex metric');
    }

    const metricResult = await super.compute(data, extras);
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
   * @param {Lantern.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fcpTimeInMs
   * @return {number}
   */
  static computeLayoutBasedSpeedIndex(nodeTimings, fcpTimeInMs) {
    /** @type {Array<{time: number, weight: number}>} */
    const layoutWeights = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== Lantern.BaseNode.TYPES.CPU) continue;

      if (node.childEvents.some(x => x.name === 'Layout')) {
        const timingWeight = Math.max(Math.log2(timing.endTime - timing.startTime), 0);
        layoutWeights.push({time: timing.endTime, weight: timingWeight});
      }
    }

    const totalWeightedTime = layoutWeights
      .map(evt => evt.weight * Math.max(evt.time, fcpTimeInMs))
      .reduce((a, b) => a + b, 0);
    const totalWeight = layoutWeights.map(evt => evt.weight).reduce((a, b) => a + b, 0);

    if (!totalWeight) return fcpTimeInMs;
    return totalWeightedTime / totalWeight;
  }
}

export {SpeedIndex};
