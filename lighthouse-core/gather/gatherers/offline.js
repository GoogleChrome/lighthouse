/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const URL = require('../../lib/url-shim.js');

class Offline extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  beforePass(passContext) {
    // This call sets up the offline state for the page navigation of the `offlinePass` in gather-runner.
    // gather-runner will automatically go back online before the `afterPass` phase, so no additional
    // cleanup is necessary.
    return passContext.driver.goOffline();
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['Offline']>}
   */
  async afterPass(passContext, loadData) {
    const navigationRecord = loadData.networkRecords.filter(record => {
      return URL.equalWithExcludedFragments(record.url, passContext.url) &&
        record.fetchedViaServiceWorker;
    }).pop(); // Take the last record that matches.

    return navigationRecord ? navigationRecord.statusCode : -1;
  }
}

module.exports = Offline;
