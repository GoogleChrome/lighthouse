/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers runtime exceptions.
 */

'use strict';

const Gatherer = require('./gatherer.js');

class RuntimeExceptions extends Gatherer {
  constructor() {
    super();
    /** @type {Array<LH.Crdp.Runtime.ExceptionThrownEvent>} */
    this._exceptions = [];
    this._onRuntimeExceptionThrown = this.onRuntimeExceptionThrown.bind(this);
  }

  /**
   * @param {LH.Crdp.Runtime.ExceptionThrownEvent} entry
   */
  onRuntimeExceptionThrown(entry) {
    this._exceptions.push(entry);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  beforePass(passContext) {
    const driver = passContext.driver;
    driver.on('Runtime.exceptionThrown', this._onRuntimeExceptionThrown);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['RuntimeExceptions']>}
   */
  async afterPass(passContext) {
    await passContext.driver.off('Runtime.exceptionThrown', this._onRuntimeExceptionThrown);
    return this._exceptions;
  }
}

module.exports = RuntimeExceptions;
