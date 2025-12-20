/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('../gatherer.js');

/* global fetch, URL, location */

/** @return {Promise<LH.Artifacts['RobotsTxt']>} */
/* istanbul ignore next */
async function getRobotsTxtContent() {
  try {
    const response = await fetch(new URL('/robots.txt', location.href).href);
    if (!response.ok) {
      return {status: response.status, content: null};
    }

    const content = await response.text();
    return {status: response.status, content};
  } catch (_) {
    return {status: null, content: null};
  }
}


class RobotsTxt extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['RobotsTxt']>}
   */
  afterPass(passContext) {
    return passContext.driver.evaluateAsync(`(${getRobotsTxtContent.toString()}())`, {
      useIsolation: true,
    });
  }
}

module.exports = RobotsTxt;
