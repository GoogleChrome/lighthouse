/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer.js');

/**
 * Collects the content of the main html document.
 */
class MainDocumentContent extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['MainDocumentContent']>}
   */
  async afterPass(passContext, loadData) {
    const mainResource = NetworkAnalyzer.findMainDocument(loadData.networkRecords, passContext.url);

    const driver = passContext.driver;
    return driver.getRequestContent(mainResource.requestId);
  }
}

module.exports = MainDocumentContent;
