/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const {
  getElementsInDocument,
  isPositionFixed,
  getNodeDetails,
} = require('../../lib/page-functions.js');

/* eslint-env browser, node */

/**
 * @return {LH.Artifacts['IFrameElements']}
 */
/* c8 ignore start */
function collectIFrameElements() {
  const iFrameElements = getElementsInDocument('iframe');
  return iFrameElements.map(node => {
    const clientRect = node.getBoundingClientRect();
    const {top, bottom, left, right, width, height} = clientRect;
    return {
      id: node.id,
      src: node.src,
      clientRect: {top, bottom, left, right, width, height},
      isPositionFixed: isPositionFixed(node),
      node: getNodeDetails(node),
    };
  });
}
/* c8 ignore stop */

class IFrameElements extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<LH.Artifacts['IFrameElements']>}
   * @override
   */
  async getArtifact(passContext) {
    const driver = passContext.driver;

    const iframeElements = await driver.executionContext.evaluate(collectIFrameElements, {
      args: [],
      useIsolation: true,
      deps: [
        getElementsInDocument,
        isPositionFixed,
        getNodeDetails,
      ],
    });
    return iframeElements;
  }
}

module.exports = IFrameElements;
