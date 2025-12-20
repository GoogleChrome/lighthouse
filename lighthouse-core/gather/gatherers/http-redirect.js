/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');

/**
 * This gatherer changes the options.url so that its pass loads the http page.
 * After load it detects if its on a crypographic scheme.
 * TODO: Instead of abusing a loadPage pass for this test, it could likely just do an XHR instead
 */
class HTTPRedirect extends Gatherer {
  constructor() {
    super();
    this._preRedirectURL = '';
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  beforePass(passContext) {
    this._preRedirectURL = passContext.url;
    passContext.url = this._preRedirectURL.replace(/^https/, 'http');
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['HTTPRedirect']>}
   */
  async afterPass(passContext) {
    // Reset the options.
    passContext.url = this._preRedirectURL;

    const expression = `new URL(window.location).protocol === 'https:'`;
    const isHttps = await passContext.driver.evaluateAsync(expression, {useIsolation: true});
    return {
      value: isHttps,
    };
  }
}

module.exports = HTTPRedirect;
