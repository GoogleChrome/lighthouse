/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * Helper functions that are passed by `toString()` by Driver to be evaluated in target page.
 *
 * Every function in this module only runs in the browser, so it is ignored from
 * the c8 code coverage tool. See c8.sh
 *
 * Important: this module should only be imported like this:
 *     const {justWhatINeed} = require('...');
 * Never like this:
 *     const pageFunctions = require('...');
 * Otherwise, `function justWhatINeed() {...}` won't be callable by the
 * invocation `pageFunctions.justWhatINeed`.
 */

/**
 * `typed-query-selector`'s CSS selector parser.
 * @template {string} T
 * @typedef {import('typed-query-selector/parser').ParseSelector<T>} ParseSelector
 */

/* global window document Node ShadowRoot HTMLElement */

/**
 * The `exceptionDetails` provided by the debugger protocol does not contain the useful
 * information such as name, message, and stack trace of the error when it's wrapped in a
 * promise. Instead, map to a successful object that contains this information.
 * @param {string|Error} [err] The error to convert
 * @return {{__failedInBrowser: boolean, name: string, message: string, stack: string|undefined}}
 */
function wrapRuntimeEvalErrorInBrowser(err) {
  if (!err || typeof err === 'string') {
    err = new Error(err);
  }

  return {
    __failedInBrowser: true,
    name: err.name || 'Error',
    message: err.message || 'unknown error',
    stack: err.stack,
  };
}

/**
 * Get all elements in the document matching `selector`, whether in the regular
 * or a shadow DOM.
 * @template {string} T
 * @param {T} selector Simple CSS selector to filter nodes on.
 *     Combinators are not supported since they won't match across shadow boundaries.
 * @return {Array<ParseSelector<T>>}
 */
function getElementsInDocument(selector) {
  const realMatchesFn = window.__ElementMatches || window.Element.prototype.matches;
  /** @type {Array<ParseSelector<T>>} */
  const results = [];

  /** @param {NodeListOf<Element>} nodes */
  const _findAllElements = nodes => {
    for (let i = 0, el; el = nodes[i]; ++i) {
      if (!selector || realMatchesFn.call(el, selector)) {
        /** @type {ParseSelector<T>} */
        // @ts-expect-error - el is verified as matching above, tsc just can't verify it through the .call().
        const matchedEl = el;
        results.push(matchedEl);
      }

      // If the element has a shadow root, dig deeper.
      if (el.shadowRoot) {
        _findAllElements(el.shadowRoot.querySelectorAll('*'));
      }
    }
  };
  _findAllElements(document.querySelectorAll('*'));

  return results;
}

/**
 * Gets the opening tag text of the given node.
 * @param {Element|ShadowRoot} element
 * @param {Array<string>=} ignoreAttrs An optional array of attribute tags to not include in the HTML snippet.
 * @return {string}
 */
function getOuterHTMLSnippet(element, ignoreAttrs = [], snippetCharacterLimit = 500) {
  const ATTRIBUTE_CHAR_LIMIT = 75;
  // Autofill information that is injected into the snippet via AutofillShowTypePredictions
  // TODO(paulirish): Don't clean title attribute from all elements if it's unnecessary
  const autoFillIgnoreAttrs = ['autofill-information', 'autofill-prediction', 'title'];

  // ShadowRoots are sometimes passed in; use their hosts' outerHTML.
  if (element instanceof ShadowRoot) {
    element = element.host;
  }

  try {
    /** @type {Element} */
    // @ts-expect-error - clone will be same type as element - see https://github.com/microsoft/TypeScript/issues/283
    const clone = element.cloneNode();

    // Prevent any potential side-effects by appending to a template element.
    // See https://github.com/GoogleChrome/lighthouse/issues/11465
    const template = element.ownerDocument.createElement('template');
    template.content.append(clone);
    ignoreAttrs.concat(autoFillIgnoreAttrs).forEach(attribute =>{
      clone.removeAttribute(attribute);
    });
    let charCount = 0;
    for (const attributeName of clone.getAttributeNames()) {
      if (charCount > snippetCharacterLimit) {
        clone.removeAttribute(attributeName);
        continue;
      }

      let attributeValue = clone.getAttribute(attributeName);
      if (attributeValue === null) continue; // Can't happen.

      let dirty = false;

      // Replace img.src with img.currentSrc. Same for audio and video.
      if (attributeName === 'src' && 'currentSrc' in element) {
        const elementWithSrc = /** @type {HTMLImageElement|HTMLMediaElement} */ (element);
        const currentSrc = elementWithSrc.currentSrc;
        // Only replace if the two URLs do not resolve to the same location.
        const documentHref = elementWithSrc.ownerDocument.location.href;
        if (new URL(attributeValue, documentHref).toString() !== currentSrc) {
          attributeValue = currentSrc;
          dirty = true;
        }
      }

      // Elide attribute value if too long.
      if (attributeValue.length > ATTRIBUTE_CHAR_LIMIT) {
        attributeValue = attributeValue.slice(0, ATTRIBUTE_CHAR_LIMIT - 1) + '…';
        dirty = true;
      }

      if (dirty) clone.setAttribute(attributeName, attributeValue);
      charCount += attributeName.length + attributeValue.length;
    }

    const reOpeningTag = /^[\s\S]*?>/;
    const [match] = clone.outerHTML.match(reOpeningTag) || [];
    if (match && charCount > snippetCharacterLimit) {
      return match.slice(0, match.length - 1) + ' …>';
    }
    return match || '';
  } catch (_) {
    // As a last resort, fall back to localName.
    return `<${element.localName}>`;
  }
}

/**
 * Get the maximum size of a texture the GPU can handle
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=770769#c13
 * @return {number}
 */
function getMaxTextureSize() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('no webgl');
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    return maxTextureSize;
  } catch (e) {
    // If the above fails for any reason we need a fallback number;
    // 4096 is the max texture size on a Pixel 2 XL, so to be conservative we'll use a low value like it.
    // But we'll subtract 1 just to identify this case later on.
    const MAX_TEXTURE_SIZE_FALLBACK = 4095;
    return MAX_TEXTURE_SIZE_FALLBACK;
  }
}

/**
 * Computes a memory/CPU performance benchmark index to determine rough device class.
 * @see https://github.com/GoogleChrome/lighthouse/issues/9085
 * @see https://docs.google.com/spreadsheets/d/1E0gZwKsxegudkjJl8Fki_sOwHKpqgXwt8aBAfuUaB8A/edit?usp=sharing
 *
 * Historically (until LH 6.3), this benchmark created a string of length 100,000 in a loop, and returned
 * the number of times per second the string can be created.
 *
 * Changes to v8 in 8.6.106 changed this number and also made Chrome more variable w.r.t GC interupts.
 * This benchmark now is a hybrid of a similar GC-heavy approach to the original benchmark and an array
 * copy benchmark.
 *
 * As of Chrome m86...
 *
 *  - 1000+ is a desktop-class device, Core i3 PC, iPhone X, etc
 *  - 800+ is a high-end Android phone, Galaxy S8, low-end Chromebook, etc
 *  - 125+ is a mid-tier Android phone, Moto G4, etc
 *  - <125 is a budget Android phone, Alcatel Ideal, Galaxy J2, etc
 * @return {number}
 */
function computeBenchmarkIndex() {
  /**
   * The GC-heavy benchmark that creates a string of length 10000 in a loop.
   * The returned index is the number of times per second the string can be created divided by 10.
   * The division by 10 is to keep similar magnitudes to an earlier version of BenchmarkIndex that
   * used a string length of 100000 instead of 10000.
   */
  function benchmarkIndexGC() {
    const start = Date.now();
    let iterations = 0;

    while (Date.now() - start < 500) {
      let s = '';
      for (let j = 0; j < 10000; j++) s += 'a'; // eslint-disable-line no-unused-vars

      iterations++;
    }

    const durationInSeconds = (Date.now() - start) / 1000;
    return Math.round(iterations / 10 / durationInSeconds);
  }

  /**
   * The non-GC-dependent benchmark that copies integers back and forth between two arrays of length 100000.
   * The returned index is the number of times per second a copy can be made, divided by 10.
   * The division by 10 is to keep similar magnitudes to the GC-dependent version.
   */
  function benchmarkIndexNoGC() {
    const arrA = [];
    const arrB = [];
    for (let i = 0; i < 100000; i++) arrA[i] = arrB[i] = i;

    const start = Date.now();
    let iterations = 0;

    // Some Intel CPUs have a performance cliff due to unlucky JCC instruction alignment.
    // Two possible fixes: call Date.now less often, or manually unroll the inner loop a bit.
    // We'll call Date.now less and only check the duration on every 10th iteration for simplicity.
    // See https://bugs.chromium.org/p/v8/issues/detail?id=10954#c1.
    while (iterations % 10 !== 0 || Date.now() - start < 500) {
      const src = iterations % 2 === 0 ? arrA : arrB;
      const tgt = iterations % 2 === 0 ? arrB : arrA;

      for (let j = 0; j < src.length; j++) tgt[j] = src[j];

      iterations++;
    }

    const durationInSeconds = (Date.now() - start) / 1000;
    return Math.round(iterations / 10 / durationInSeconds);
  }

  // The final BenchmarkIndex is a simple average of the two components.
  return (benchmarkIndexGC() + benchmarkIndexNoGC()) / 2;
}

/**
 * Adapted from DevTools' SDK.DOMNode.prototype.path
 *   https://github.com/ChromeDevTools/devtools-frontend/blob/4fff931bb/front_end/sdk/DOMModel.js#L625-L647
 * Backend: https://source.chromium.org/search?q=f:node.cc%20symbol:PrintNodePathTo&sq=&ss=chromium%2Fchromium%2Fsrc
 *
 * TODO: DevTools nodePath handling doesn't support iframes, but probably could. https://crbug.com/1127635
 * @param {Node} node
 * @return {string}
 */
function getNodePath(node) {
  // For our purposes, there's no worthwhile difference between shadow root and document fragment
  // We can consider them entirely synonymous.
  /** @param {Node} node @return {node is ShadowRoot} */
  const isShadowRoot = node => node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
  /** @param {Node} node */
  const getNodeParent = node => isShadowRoot(node) ? node.host : node.parentNode;

  /** @param {Node} node @return {number|'a'} */
  function getNodeIndex(node) {
    if (isShadowRoot(node)) {
      // User-agent shadow roots get 'u'. Non-UA shadow roots get 'a'.
      return 'a';
    }
    let index = 0;
    let prevNode;
    while (prevNode = node.previousSibling) {
      node = prevNode;
      // skip empty text nodes
      if (node.nodeType === Node.TEXT_NODE && (node.nodeValue || '').trim().length === 0) continue;
      index++;
    }
    return index;
  }

  /** @type {Node|null} */
  let currentNode = node;
  const path = [];
  while (currentNode && getNodeParent(currentNode)) {
    const index = getNodeIndex(currentNode);
    path.push([index, currentNode.nodeName]);
    currentNode = getNodeParent(currentNode);
  }
  path.reverse();
  return path.join(',');
}

/**
 * @param {Element} element
 * @return {string}
 *
 * Note: CSS Selectors having no standard mechanism to describe shadow DOM piercing. So we can't.
 *
 * If the node resides within shadow DOM, the selector *only* starts from the shadow root.
 * For example, consider this img within a <section> within a shadow root..
 *  - DOM: <html> <body> <div> #shadow-root <section> <img/>
 *  - nodePath: 0,HTML,1,BODY,1,DIV,a,#document-fragment,0,SECTION,0,IMG
 *  - nodeSelector: section > img
 */
function getNodeSelector(element) {
  /**
   * @param {Element} element
   */
  function getSelectorPart(element) {
    let part = element.tagName.toLowerCase();
    if (element.id) {
      part += '#' + element.id;
    } else if (element.classList.length > 0) {
      part += '.' + element.classList[0];
    }
    return part;
  }

  const parts = [];
  while (parts.length < 4) {
    parts.unshift(getSelectorPart(element));
    if (!element.parentElement) {
      break;
    }
    element = element.parentElement;
    if (element.tagName === 'HTML') {
      break;
    }
  }
  return parts.join(' > ');
}

/**
 * This function checks if an element or an ancestor of an element is `position:fixed`.
 * In addition we ensure that the element is capable of behaving as a `position:fixed`
 * element, checking that it lives within a scrollable ancestor.
 * @param {HTMLElement} element
 * @return {boolean}
 */
function isPositionFixed(element) {
  /**
   * @param {HTMLElement} element
   * @param {'overflowY'|'position'} attr
   * @return {string}
   */
  function getStyleAttrValue(element, attr) {
    // Check style before computedStyle as computedStyle is expensive.
    return element.style[attr] || window.getComputedStyle(element)[attr];
  }

  // Position fixed/sticky has no effect in case when document does not scroll.
  const htmlEl = document.querySelector('html');
  if (!htmlEl) throw new Error('html element not found in document');
  if (htmlEl.scrollHeight <= htmlEl.clientHeight ||
      !['scroll', 'auto', 'visible'].includes(getStyleAttrValue(htmlEl, 'overflowY'))) {
    return false;
  }

  /** @type {HTMLElement | null} */
  let currentEl = element;
  while (currentEl) {
    const position = getStyleAttrValue(currentEl, 'position');
    if ((position === 'fixed' || position === 'sticky')) {
      return true;
    }
    currentEl = currentEl.parentElement;
  }
  return false;
}

/**
 * Generate a human-readable label for the given element, based on end-user facing
 * strings like the innerText or alt attribute.
 * Returns label string or null if no useful label is found.
 * @param {Element} element
 * @return {string | null}
 */
function getNodeLabel(element) {
  // Inline so that audits that import getNodeLabel don't
  // also need to import truncate
  /**
   * @param {string} str
   * @param {number} maxLength
   * @return {string}
   */
  function truncate(str, maxLength) {
    if (str.length <= maxLength) {
      return str;
    }
    // Take advantage of string iterator multi-byte character awareness.
    // Regular `.slice` will ignore unicode character boundaries and lead to malformed text.
    return Array.from(str).slice(0, maxLength - 1).join('') + '…';
  }

  const tagName = element.tagName.toLowerCase();
  // html and body content is too broad to be useful, since they contain all page content
  if (tagName !== 'html' && tagName !== 'body') {
    const nodeLabel = element instanceof HTMLElement && element.innerText ||
        element.getAttribute('alt') || element.getAttribute('aria-label');
    if (nodeLabel) {
      return truncate(nodeLabel, 80);
    } else {
      // If no useful label was found then try to get one from a child.
      // E.g. if an a tag contains an image but no text we want the image alt/aria-label attribute.
      const nodeToUseForLabel = element.querySelector('[alt], [aria-label]');
      if (nodeToUseForLabel) {
        return getNodeLabel(nodeToUseForLabel);
      }
    }
  }
  return null;
}

/**
 * @param {Element} element
 * @return {LH.Artifacts.Rect}
 */
function getBoundingClientRect(element) {
  // The protocol does not serialize getters, so extract the values explicitly.
  const rect = element.getBoundingClientRect();
  return {
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/**
 * RequestIdleCallback shim that calculates the remaining deadline time in order to avoid a potential lighthouse
 * penalty for tests run with simulated throttling. Reduces the deadline time to (50 - safetyAllowance) / cpuSlowdownMultiplier to
 * ensure a long task is very unlikely if using the API correctly.
 * @param {number} cpuSlowdownMultiplier
 */
function wrapRequestIdleCallback(cpuSlowdownMultiplier) {
  const safetyAllowanceMs = 10;
  const maxExecutionTimeMs = Math.floor((50 - safetyAllowanceMs) / cpuSlowdownMultiplier);
  const nativeRequestIdleCallback = window.requestIdleCallback;
  window.requestIdleCallback = (cb, options) => {
    /**
     * @type {Parameters<typeof window['requestIdleCallback']>[0]}
     */
    const cbWrap = (deadline) => {
      const start = Date.now();
      // @ts-expect-error - save original on non-standard property.
      deadline.__timeRemaining = deadline.timeRemaining;
      deadline.timeRemaining = () => {
        // @ts-expect-error - access non-standard property.
        const timeRemaining = deadline.__timeRemaining();
        return Math.min(timeRemaining, Math.max(0, maxExecutionTimeMs - (Date.now() - start))
        );
      };
      deadline.timeRemaining.toString = () => {
        return 'function timeRemaining() { [native code] }';
      };
      cb(deadline);
    };
    return nativeRequestIdleCallback(cbWrap, options);
  };
  window.requestIdleCallback.toString = () => {
    return 'function requestIdleCallback() { [native code] }';
  };
}

/**
 * @param {Element|ShadowRoot} element
 * @return {LH.Artifacts.NodeDetails}
 */
function getNodeDetails(element) {
  // This bookkeeping is for the FullPageScreenshot gatherer.
  if (!window.__lighthouseNodesDontTouchOrAllVarianceGoesAway) {
    window.__lighthouseNodesDontTouchOrAllVarianceGoesAway = new Map();
  }

  element = element instanceof ShadowRoot ? element.host : element;
  const selector = getNodeSelector(element);

  // Create an id that will be unique across all execution contexts.
  // The id could be any arbitrary string, the exact value is not important.
  // For example, tagName is added only because it might be useful for debugging.
  // But execution id and map size are added to ensure uniqueness.
  // We also dedupe this id so that details collected for an element within the same
  // pass and execution context will share the same id. Not technically important, but
  // cuts down on some duplication.
  let lhId = window.__lighthouseNodesDontTouchOrAllVarianceGoesAway.get(element);
  if (!lhId) {
    lhId = [
      window.__lighthouseExecutionContextId !== undefined ?
        window.__lighthouseExecutionContextId :
        'page',
      window.__lighthouseNodesDontTouchOrAllVarianceGoesAway.size,
      element.tagName,
    ].join('-');
    window.__lighthouseNodesDontTouchOrAllVarianceGoesAway.set(element, lhId);
  }

  const details = {
    lhId,
    devtoolsNodePath: getNodePath(element),
    selector: selector,
    boundingRect: getBoundingClientRect(element),
    snippet: getOuterHTMLSnippet(element),
    nodeLabel: getNodeLabel(element) || selector,
  };

  return details;
}

// HACK: `getNodeDetails` is a function used in many places with multiple deps
// that would need to be listed in the `evaluate()` call every time it's used.
// The deps could be inlined, but they need to be available externally for
// testing. So, override `getNodeDetails.toString()` to include all the deps.
/** @type {string} */
const originalgetNodeDetailsToString = getNodeDetails.toString();
getNodeDetails.toString = () => `
  ${getNodePath.toString()}
  ${getNodeSelector.toString()}
  ${getBoundingClientRect.toString()}
  ${getOuterHTMLSnippet.toString()}
  ${getNodeLabel.toString()}
  ${originalgetNodeDetailsToString}`;

module.exports = {
  wrapRuntimeEvalErrorInBrowser,
  getElementsInDocument,
  getOuterHTMLSnippet,
  computeBenchmarkIndex,
  getMaxTextureSize,
  getNodeDetails,
  getNodePath,
  getNodeSelector,
  getNodeLabel,
  isPositionFixed,
  wrapRequestIdleCallback,
  getBoundingClientRect,
};
