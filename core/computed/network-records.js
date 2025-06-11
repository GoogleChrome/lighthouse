/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../types/lh.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecorder} from '../lib/network-recorder.js';

class NetworkRecords {
  /**
   * @param {LH.DevtoolsLog} devtoolsLog
   * @return {Promise<Array<LH.Artifacts.NetworkRequest>>} networkRecords
   */
  static async compute_(devtoolsLog) {
    return NetworkRecorder.recordsFromLogs(devtoolsLog);
  }
}

const NetworkRecordsComputed = makeComputedArtifact(NetworkRecords, null);
export {NetworkRecordsComputed as NetworkRecords};
