/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Gathers stats about the max height and width of the DOM tree
 * and total number of elements used on the page.
 */

/* global getNodeDetails document */


import BaseGatherer from '../../base-gatherer.js';
import {pageFunctions} from '../../../lib/page-functions.js';

/**
 * Calculates the maximum tree depth of the DOM.
 * @param {HTMLElement} element Root of the tree to look in.
 * @param {boolean=} deep True to include shadow roots. Defaults to true.
 * @return {LH.Artifacts.DOMStats}
 */
/* c8 ignore start */
function getDOMStats(element = document.body, deep = true) {
  let deepestElement = null;
  let maxDepth = -1;
  let maxWidth = -1;
  let numElements = 0;
  let parentWithMostChildren = null;

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
      // @ts-expect-error - getNodeDetails put into scope via stringification
      ...getNodeDetails(deepestElement),
    },
    width: {
      max: result.maxWidth,
      // @ts-expect-error - getNodeDetails put into scope via stringification
      ...getNodeDetails(parentWithMostChildren),
    },
    totalBodyElements: result.numElements,
  };
}
/* c8 ignore stop */

class DOMStats extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['DOMStats']>}
   */
  async getArtifact(passContext) {
    const driver = passContext.driver;

    await driver.defaultSession.sendCommand('DOM.enable');
    const results = await driver.executionContext.evaluate(getDOMStats, {
      args: [],
      useIsolation: true,
      deps: [pageFunctions.getNodeDetails],
    });
    await driver.defaultSession.sendCommand('DOM.disable');
    return results;
  }
}

export default DOMStats;
