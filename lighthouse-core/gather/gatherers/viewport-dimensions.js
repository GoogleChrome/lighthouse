/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');

/* global window */

/**
 * @return {Promise<LH.Artifacts.ViewportDimensions>}
 */
/* istanbul ignore next */
function getViewportDimensions() {
  // window.innerWidth to get the scrollable size of the window (irrespective of zoom)
  // window.outerWidth to get the size of the visible area
  // window.devicePixelRatio to get ratio of logical pixels to physical pixels
  return Promise.resolve({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
  });
}

class ViewportDimensions extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.ViewportDimensions>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    /** @type {LH.Artifacts.ViewportDimensions} */
    const dimensions = await driver.evaluateAsync(`(${getViewportDimensions.toString()}())`,
      {useIsolation: true});

    const allNumeric = Object.values(dimensions).every(Number.isFinite);
    if (!allNumeric) {
      const results = JSON.stringify(dimensions);
      throw new Error(`ViewportDimensions results were not numeric: ${results}`);
    }

    return dimensions;
  }
}

module.exports = ViewportDimensions;
