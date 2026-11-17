/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import * as Lantern from '../lib/lantern/lantern.js';
import {NetworkAnalysis} from './network-analysis.js';

class LoadSimulator {
  /**
   * @param {{devtoolsLog: LH.DevtoolsLog, settings: LH.Artifacts.ComputedSettings}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Gatherer.Simulation.Simulator>}
   */
  static async compute_(data, context) {
    const networkAnalysis = await NetworkAnalysis.request(data.devtoolsLog, context);
    const throttling = data.settings.throttling ?
      {...Lantern.Simulation.Constants.throttling.mobileSlow4G, ...data.settings.throttling} :
      undefined;
    return Lantern.Simulation.Simulator.createSimulator({
      ...data.settings,
      throttling,
      networkAnalysis,
    });
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

const LoadSimulatorComputed = makeComputedArtifact(LoadSimulator, ['devtoolsLog', 'settings']);
export {LoadSimulatorComputed as LoadSimulator};
