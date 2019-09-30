/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');

/* global window document performance */

/* istanbul ignore next */
function initializeVisibility() {
  // @ts-ignore
  window.___LH_VISIBILITY = [];
  const capture = () => {
    // @ts-ignore
    window.___LH_VISIBILITY.push({
      state: document.visibilityState,
      ts: performance.now(),
    });
  };

  capture();
  window.addEventListener('visibilitychange', capture);
}

class Visibility extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    await passContext.driver.evaluateScriptOnNewDocument(`(${initializeVisibility})()`);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['Visibility']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    /** @type {LH.Artifacts['Visibility']|void} */
    const Visibility = await driver.evaluateAsync('window.___LH_VISIBILITY');
    if (!Array.isArray(Visibility)) {
      throw new Error('Unable to retrieve visibility events');
    }
    return Visibility;
  }
}

module.exports = Visibility;
