/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkAnalyzer} from '../lib/lantern/simulator/NetworkAnalyzer.js';
import {NetworkRecords} from './network-records.js';

class NetworkAnalysis {
  /**
   * @param {LH.DevtoolsLog} devtoolsLog
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.NetworkAnalysis>}
   */
  static async compute_(devtoolsLog, context) {
    const records = await NetworkRecords.request(devtoolsLog, context);
    return NetworkAnalyzer.analyze(records);
  }
}

const NetworkAnalysisComputed = makeComputedArtifact(NetworkAnalysis, null);
export {NetworkAnalysisComputed as NetworkAnalysis};
