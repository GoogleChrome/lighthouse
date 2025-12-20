/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers console deprecation and intervention warnings logged by Chrome.
 */

'use strict';

const Gatherer = require('./gatherer.js');

class ConsoleMessages extends Gatherer {
  constructor() {
    super();
    /** @type {Array<LH.Crdp.Log.EntryAddedEvent>} */
    this._logEntries = [];
    this._onConsoleEntryAdded = this.onConsoleEntry.bind(this);
  }

  /**
   * @param {LH.Crdp.Log.EntryAddedEvent} entry
   */
  onConsoleEntry(entry) {
    this._logEntries.push(entry);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    const driver = passContext.driver;
    driver.on('Log.entryAdded', this._onConsoleEntryAdded);
    await driver.sendCommand('Log.enable');
    await driver.sendCommand('Log.startViolationsReport', {
      config: [{name: 'discouragedAPIUse', threshold: -1}],
    });
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['ConsoleMessages']>}
   */
  async afterPass(passContext) {
    await passContext.driver.sendCommand('Log.stopViolationsReport');
    await passContext.driver.off('Log.entryAdded', this._onConsoleEntryAdded);
    await passContext.driver.sendCommand('Log.disable');
    return this._logEntries;
  }
}

module.exports = ConsoleMessages;
