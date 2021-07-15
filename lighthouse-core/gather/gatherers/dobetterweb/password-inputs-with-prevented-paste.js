/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document ClipboardEvent */

const FRGatherer = require('../../../fraggle-rock/gather/base-gatherer.js');
const {getNodeDetails} = require('../../../lib/page-functions.js');

/**
 * @return {LH.Artifacts['PasswordInputsWithPreventedPaste']}
 */
/* c8 ignore start */
function findPasswordInputsWithPreventedPaste() {
  return Array.from(document.querySelectorAll('input[type="password"]'))
    .filter(passwordInput =>
      !passwordInput.dispatchEvent(
        new ClipboardEvent('paste', {cancelable: true})
      )
    )
    .map(passwordInput => ({
      node: getNodeDetails(passwordInput),
    }));
}
/* c8 ignore stop */

class PasswordInputsWithPreventedPaste extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<LH.Artifacts['PasswordInputsWithPreventedPaste']>}
   */
  getArtifact(passContext) {
    return passContext.driver.executionContext.evaluate(findPasswordInputsWithPreventedPaste, {
      args: [],
      deps: [getNodeDetails],
    });
  }
}


module.exports = PasswordInputsWithPreventedPaste;
