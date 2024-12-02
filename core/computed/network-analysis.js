/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lib/lantern/lantern.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';

class NetworkAnalysis {
  /**
   * @param {LH.DevtoolsLog} devtoolsLog
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.NetworkAnalysis>}
   */
  static async compute_(devtoolsLog, context) {
    const records = await NetworkRecords.request(devtoolsLog, context);
    const analyis = Lantern.Core.NetworkAnalyzer.analyze(records);
    if (!analyis) {
      throw new Error('Could not compute network analysis');
    }
    return analyis;
  }
}

const NetworkAnalysisComputed = makeComputedArtifact(NetworkAnalysis, null);
export {NetworkAnalysisComputed as NetworkAnalysis};
