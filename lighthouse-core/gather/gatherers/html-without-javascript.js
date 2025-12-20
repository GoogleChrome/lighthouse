/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');

/**
 * @fileoverview Returns the innerText of the <body> element while JavaScript is
 * disabled.
 */

/* global document */

/* istanbul ignore next */
function getBodyText() {
  // note: we use innerText, not textContent, because textContent includes the content of <script> elements!
  const body = document.querySelector('body');
  return Promise.resolve({
    bodyText: body ? body.innerText : '',
    hasNoScript: !!document.querySelector('noscript'),
  });
}

class HTMLWithoutJavaScript extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  beforePass(passContext) {
    passContext.disableJavaScript = true;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['HTMLWithoutJavaScript']>}
   */
  async afterPass(passContext) {
    // Reset the JS disable.
    passContext.disableJavaScript = false;

    const expression = `(${getBodyText.toString()}())`;
    const {bodyText, hasNoScript} = await passContext.driver.evaluateAsync(expression);
    if (typeof bodyText !== 'string') {
      throw new Error('document body innerText returned by protocol was not a string');
    }

    return {
      bodyText,
      hasNoScript,
    };
  }
}

module.exports = HTMLWithoutJavaScript;
