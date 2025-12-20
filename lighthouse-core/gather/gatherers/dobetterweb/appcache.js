/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('../gatherer.js');

class AppCacheManifest extends Gatherer {
  /**
   * Returns the value of the html element's manifest attribute or null if it
   * is not defined.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['AppCacheManifest']>}
   */
  afterPass(passContext) {
    const driver = passContext.driver;

    return driver.querySelector('html')
      .then(node => node && node.getAttribute('manifest'));
  }
}

module.exports = AppCacheManifest;
