/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkRecorder = require('../lib/network-recorder.js');

class NetworkRecords {
  /**
   * @param {LH.DevtoolsLog} devtoolsLog
   * @return {Promise<Array<LH.Artifacts.NetworkRequest>>} networkRecords
   */
  static async compute_(devtoolsLog) {
    return NetworkRecorder.recordsFromLogs(devtoolsLog);
  }
}

module.exports = makeComputedArtifact(NetworkRecords);
