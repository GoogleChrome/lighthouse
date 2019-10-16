/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer.js');

/**
 * Collects the content of the initially-requested html document.
 */
class InitialHtml extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['InitialHtml']>}
   */
  async afterPass(passContext, loadData) {
    const mainResource = NetworkAnalyzer.findMainDocument(loadData.networkRecords, passContext.url);

    const driver = passContext.driver;
    const mainContent = await driver.getRequestContent(mainResource.requestId);

    return mainContent;
  }
}

module.exports = InitialHtml;
