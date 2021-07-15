/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers stats about the max height and width of the DOM tree
 * and total number of elements used on the page.
 */

/* global document */

'use strict';

const FRGatherer = require('../../../fraggle-rock/gather/base-gatherer.js');
const {getNodeDetails} = require('../../../lib/page-functions.js');

/**
 * Calculates the maximum tree depth of the DOM.
 * @param {HTMLElement} element Root of the tree to look in.
 * @param {boolean=} deep True to include shadow roots. Defaults to true.
 * @return {LH.Artifacts.DOMStats}
 */
/* c8 ignore start */
function getDOMStats(element = document.body, deep = true) {
  /** @type {Element|ShadowRoot} */
  let deepestElement = element;
  let maxDepth = -1;
  let maxWidth = -1;
  let numElements = 0;
  /** @type {Element|ShadowRoot} */
  let parentWithMostChildren = element;

  /**
   * @param {Element|ShadowRoot} element
   * @param {number} depth
   */
  const _calcDOMWidthAndHeight = function(element, depth = 1) {
    if (depth > maxDepth) {
      deepestElement = element;
      maxDepth = depth;
    }
    if (element.children.length > maxWidth) {
      parentWithMostChildren = element;
      maxWidth = element.children.length;
    }

    let child = element.firstElementChild;
    while (child) {
      _calcDOMWidthAndHeight(child, depth + 1);
      // If element has shadow dom, traverse into that tree.
      if (deep && child.shadowRoot) {
        _calcDOMWidthAndHeight(child.shadowRoot, depth + 1);
      }
      child = child.nextElementSibling;
      numElements++;
    }

    return {maxDepth, maxWidth, numElements};
  };

  const result = _calcDOMWidthAndHeight(element);

  return {
    depth: {
      max: result.maxDepth,
      ...getNodeDetails(deepestElement),
    },
    width: {
      max: result.maxWidth,
      ...getNodeDetails(parentWithMostChildren),
    },
    totalBodyElements: result.numElements,
  };
}
/* c8 ignore stop */

class DOMStats extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<LH.Artifacts['DOMStats']>}
   */
  async getArtifact(passContext) {
    const driver = passContext.driver;

    await driver.defaultSession.sendCommand('DOM.enable');
    const results = await driver.executionContext.evaluate(getDOMStats, {
      args: [],
      useIsolation: true,
      deps: [getNodeDetails],
    });
    await driver.defaultSession.sendCommand('DOM.disable');
    return results;
  }
}

module.exports = DOMStats;
