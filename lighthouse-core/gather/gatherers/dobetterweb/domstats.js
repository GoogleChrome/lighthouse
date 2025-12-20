/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
/**
 * @fileoverview Gathers stats about the max height and width of the DOM tree
 * and total number of elements used on the page.
 */

/* global ShadowRoot, getOuterHTMLSnippet */

'use strict';

const Gatherer = require('../gatherer.js');
const pageFunctions = require('../../../lib/page-functions.js');

/**
 * Constructs a pretty label from element's selectors. For example, given
 * <div id="myid" class="myclass">, returns 'div#myid.myclass'.
 * @param {Element} element
 * @return {string}
 */
/* istanbul ignore next */
function createSelectorsLabel(element) {
  let name = element.localName || '';
  const idAttr = element.getAttribute && element.getAttribute('id');
  if (idAttr) {
    name += `#${idAttr}`;
  }
  // svg elements return SVGAnimatedString for .className, which is an object.
  // Stringify classList instead.
  if (element.classList) {
    const className = element.classList.toString();
    if (className) {
      name += `.${className.trim().replace(/\s+/g, '.')}`;
    }
  } else if (ShadowRoot.prototype.isPrototypeOf(element)) {
    name += '#shadow-root';
  }

  return name;
}

/**
 * @param {Node} element
 * @return {Array<string>}
 */
/* istanbul ignore next */
function elementPathInDOM(element) {
  const visited = new Set();
  const path = [createSelectorsLabel(element)];
  let node = element;
  while (node) {
    visited.add(node);

    // Anchor elements have a .host property. Be sure we've found a shadow root
    // host and not an anchor.
    if (ShadowRoot.prototype.isPrototypeOf(node)) {
      const isShadowHost = node.host && node.localName !== 'a';
      node = isShadowHost ? node.host : node.parentElement;
    } else {
      const isShadowHost = node.parentNode && node.parentNode.host &&
                           node.parentNode.localName !== 'a';
      node = isShadowHost ? node.parentNode.host : node.parentElement;
    }

    if (visited.has(node)) {
      node = null;
    }

    if (node) {
      path.unshift(createSelectorsLabel(node));
    }
  }
  return path;
}

/**
 * Calculates the maximum tree depth of the DOM.
 * @param {HTMLElement} element Root of the tree to look in.
 * @param {boolean=} deep True to include shadow roots. Defaults to true.
 * @return {LH.Artifacts.DOMStats}
 */
/* istanbul ignore next */
function getDOMStats(element, deep = true) {
  let deepestElement = null;
  let maxDepth = -1;
  let maxWidth = -1;
  let numElements = 0;
  let parentWithMostChildren = null;

  /**
   * @param {Element} element
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
      pathToElement: elementPathInDOM(deepestElement),
      // ignore style since it will provide no additional context, and is often long
      snippet: getOuterHTMLSnippet(deepestElement, ['style']),
    },
    width: {
      max: result.maxWidth,
      pathToElement: elementPathInDOM(parentWithMostChildren),
      snippet: getOuterHTMLSnippet(parentWithMostChildren, ['style']),
    },
    totalBodyElements: result.numElements,
  };
}

class DOMStats extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['DOMStats']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    const expression = `(function() {
      ${pageFunctions.getOuterHTMLSnippetString};
      ${createSelectorsLabel.toString()};
      ${elementPathInDOM.toString()};
      return (${getDOMStats.toString()}(document.body));
    })()`;
    await driver.sendCommand('DOM.enable');
    const results = await driver.evaluateAsync(expression, {useIsolation: true});
    await driver.sendCommand('DOM.disable');
    return results;
  }
}

module.exports = DOMStats;
