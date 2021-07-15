/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const constants = require('../config/constants.js');
const Simulator = require('../lib/dependency-graph/simulator/simulator.js');
const NetworkAnalysis = require('./network-analysis.js');

class LoadSimulator {
  /**
   * @param {{devtoolsLog: LH.DevtoolsLog, settings: Immutable<LH.Config.Settings>}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<Simulator>}
   */
  static async compute_(data, context) {
    const {throttlingMethod, throttling, precomputedLanternData, useFixedLanternRtt} = 
        data.settings;
    const networkAnalysis = await NetworkAnalysis.request(data.devtoolsLog, context);

    /** @type {LH.Gatherer.Simulation.Options} */
    const options = {
      additionalRttByOrigin: networkAnalysis.additionalRttByOrigin,
      serverResponseTimeByOrigin: networkAnalysis.serverResponseTimeByOrigin,
    };

    // The fixedRTT and precomputedLanternData options trade ground truth for metric stability

    // Don't use our observed estimates from the network and used fixed values
    if (useFixedLanternRtt) {
      const fixedValues = constants.fixedLanternRtt;

      for (const origin of networkAnalysis.additionalRttByOrigin.keys()) {
        networkAnalysis.additionalRttByOrigin.set(origin, fixedValues.globalRtt);
      }
      for (const origin of networkAnalysis.serverResponseTimeByOrigin.keys()) {
        networkAnalysis.serverResponseTimeByOrigin.set(origin, fixedValues.globalServerResponse);
      }
    }

    // And if there's any have precomputed lantern data, overwrite any observed estimates (or fixedRTT values)
    if (precomputedLanternData) {
      // apply any specific overrides on top.
      Object.entries(precomputedLanternData.additionalRttByOrigin)
          .forEach(([key, rtt]) => networkAnalysis.additionalRttByOrigin.set(key, rtt));
          Object.entries(precomputedLanternData.serverResponseTimeByOrigin)
          .forEach(([key, srt]) => networkAnalysis.serverResponseTimeByOrigin.set(key, srt));
    }

    switch (throttlingMethod) {
      case 'provided':
        options.rtt = networkAnalysis.rtt;
        options.throughput = networkAnalysis.throughput;
        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case 'devtools':
        if (throttling) {
          options.rtt =
            throttling.requestLatencyMs / constants.throttling.DEVTOOLS_RTT_ADJUSTMENT_FACTOR;
          options.throughput =
            throttling.downloadThroughputKbps * 1024 /
            constants.throttling.DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR;
        }

        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case 'simulate':
        if (throttling) {
          options.rtt = throttling.rttMs;
          options.throughput = throttling.throughputKbps * 1024;
          options.cpuSlowdownMultiplier = throttling.cpuSlowdownMultiplier;
        }
        break;
      default:
        // intentionally fallback to simulator defaults
        break;
    }

    return new Simulator(options);
  }

  /**
   * @param {LH.Artifacts.NetworkAnalysis} networkAnalysis
   * @return {LH.PrecomputedLanternData}
   */
  static convertAnalysisToSaveableLanternData(networkAnalysis) {
    /** @type {LH.PrecomputedLanternData} */
    const lanternData = {additionalRttByOrigin: {}, serverResponseTimeByOrigin: {}};
    for (const [origin, value] of networkAnalysis.additionalRttByOrigin.entries()) {
      if (origin.startsWith('http')) lanternData.additionalRttByOrigin[origin] = value;
    }

    for (const [origin, value] of networkAnalysis.serverResponseTimeByOrigin.entries()) {
      if (origin.startsWith('http')) lanternData.serverResponseTimeByOrigin[origin] = value;
    }

    return lanternData;
  }
}

module.exports = makeComputedArtifact(LoadSimulator);
