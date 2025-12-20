/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkAnalyzer = require('../lib/dependency-graph/simulator/network-analyzer.js');
const NetworkRecords = require('./network-records.js');

/**
 * @fileoverview This artifact identifies the main resource on the page. Current solution assumes
 * that the main resource is the first non-rediected one.
 */
class MainResource {
  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.NetworkRequest>}
   */
  static async compute_(data, context) {
    const finalUrl = data.URL.finalUrl;
    const requests = await NetworkRecords.request(data.devtoolsLog, context);
    const mainResource = NetworkAnalyzer.findMainDocument(requests, finalUrl);
    if (!mainResource) {
      throw new Error('Unable to identify the main resource');
    }

    return mainResource;
  }
}

module.exports = makeComputedArtifact(MainResource);
