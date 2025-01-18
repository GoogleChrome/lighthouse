/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createRequire} from 'module';

import {Util} from '../../shared/util.js';

/**
 * @fileoverview
 * Helper functions that are passed by `toString()` by Driver to be evaluated in target page.
 *
 * Every function in this module only runs in the browser, so it is ignored from
 * the c8 code coverage tool. See c8.sh
 *
 * Important: this module should only be imported like this:
 *     const pageFunctions = require('...');
 * Never like this:
 *     const {justWhatINeed} = require('...');
 * Otherwise, minification will mangle the variable names and break usage.
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
 * @template {string} T
 * @param {T=} selector Optional simple CSS selector to filter nodes on.
 *     Combinators are not supported.
 * @return {Array<ParseSelector<T>>}
 */
function getElementsInDocument(selector) {
  const realMatchesFn = window.__ElementMatches || window.Element.prototype.matches;
  /** @type {Array<ParseSelector<T>>} */
  const results = [];

  /** @param {NodeListOf<Element>} nodes */
  const _findAllElements = nodes => {
    for (const el of nodes) {
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
      const truncatedString = truncate(attributeValue, ATTRIBUTE_CHAR_LIMIT);
      if (truncatedString !== attributeValue) dirty = true;
      attributeValue = truncatedString;

      if (dirty) {
        // Style attributes can be blocked by the CSP if they are set via `setAttribute`.
        // If we are trying to set the style attribute, use `el.style.cssText` instead.
        // https://github.com/GoogleChrome/lighthouse/issues/13630
        if (attributeName === 'style') {
          const elementWithStyle = /** @type {HTMLElement} */ (clone);
          elementWithStyle.style.cssText = attributeValue;
        } else {
          clone.setAttribute(attributeName, attributeValue);
        }
      }
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
      for (let j = 0; j < 10000; j++) s += 'a';
      if (s.length === 1) throw new Error('will never happen, but prevents compiler optimizations');

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
    while (prevNode = node.previousSibling) { // eslint-disable-line no-cond-assign
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
  const realBoundingClientRect = window.__HTMLElementBoundingClientRect ||
    window.HTMLElement.prototype.getBoundingClientRect;
  // The protocol does not serialize getters, so extract the values explicitly.
  const rect = realBoundingClientRect.call(element);
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
  //
  // Made up of 3 components:
  //   - prefix unique to specific execution context
  //   - nth unique node seen by this function for this execution context
  //   - node tagName
  //
  // Every page load only has up to two associated contexts - the page context
  // (denoted as `__lighthouseExecutionContextUniqueIdentifier` being undefined)
  // and the isolated context. The id must be unique to distinguish gatherers running
  // on different page loads that identify the same logical element, for purposes
  // of the full page screenshot node lookup; hence the prefix.
  //
  // The id could be any arbitrary string, the exact value is not important.
  // For example, tagName is added only because it might be useful for debugging.
  // But execution id and map size are added to ensure uniqueness.
  // We also dedupe this id so that details collected for an element within the same
  // pass and execution context will share the same id. Not technically important, but
  // cuts down on some duplication.
  let lhId = window.__lighthouseNodesDontTouchOrAllVarianceGoesAway.get(element);
  if (!lhId) {
    lhId = [
      window.__lighthouseExecutionContextUniqueIdentifier === undefined ?
        'page' :
        window.__lighthouseExecutionContextUniqueIdentifier,
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

/**
 *
 * @param {string} string
 * @param {number} characterLimit
 * @return {string}
 */
function truncate(string, characterLimit) {
  return Util.truncate(string, characterLimit);
}

function isBundledEnvironment() {
  // If we're in DevTools or LightRider, we are definitely bundled.
  // TODO: refactor and delete `global.isDevtools`.
  if (global.isDevtools || global.isLightrider) return true;

  const require = createRequire(import.meta.url);

  try {
    // Not foolproof, but `lighthouse-logger` is a dependency of lighthouse that should always be resolvable.
    // `require.resolve` will only throw in atypical/bundled environments.
    require.resolve('lighthouse-logger');
    return false;
  } catch (err) {
    return true;
  }
}

// This is to support bundled lighthouse.
// esbuild calls every function with a builtin `__name` (since we set keepNames: true),
// whose purpose is to store the real name of the function so that esbuild can rename it to avoid
// collisions. Anywhere we inject dynamically generated code at runtime for the browser to process,
// we must manually include this function (because esbuild only does so once at the top scope of
// the bundle, which is irrelevant for code executed in the browser).
// When minified, esbuild will mangle the name of this wrapper function, so we need to determine what it
// is at runtime in order to recreate it within the page.
const esbuildFunctionWrapperString = createEsbuildFunctionWrapper();

function createEsbuildFunctionWrapper() {
  if (!isBundledEnvironment()) {
    return '';
  }

  const functionAsString = (()=>{
    // eslint-disable-next-line no-unused-vars
    const a = ()=>{};
  }).toString()
    // When not minified, esbuild annotates the call to this function wrapper with PURE.
    // We know further that the name of the wrapper function should be `__name`, but let's not
    // hardcode that. Remove the PURE annotation to simplify the regex.
    .replace('/* @__PURE__ */', '');
  const functionStringMatch = functionAsString.match(/=\s*([\w_]+)\(/);
  if (!functionStringMatch) {
    throw new Error('Could not determine esbuild function wrapper name');
  }

  /**
   * @param {Function} fn
   * @param {string} value
   */
  const esbuildFunctionWrapper = (fn, value) =>
    Object.defineProperty(fn, 'name', {value, configurable: true});
  const wrapperFnName = functionStringMatch[1];
  return `let ${wrapperFnName}=${esbuildFunctionWrapper}`;
}

/**
 * @param {Function} fn
 * @return {string}
 */
function getRuntimeFunctionName(fn) {
  const match = fn.toString().match(/function ([\w$]+)/);
  if (!match) throw new Error(`could not find function name for: ${fn}`);
  return match[1];
}

// We setup a number of our page functions to automatically include their dependencies.
// Because of esbuild bundling, we must refer to the actual (mangled) runtime function name.
/** @type {Record<string, string>} */
const names = {
  truncate: getRuntimeFunctionName(truncate),
  getNodeLabel: getRuntimeFunctionName(getNodeLabel),
  getOuterHTMLSnippet: getRuntimeFunctionName(getOuterHTMLSnippet),
  getNodeDetails: getRuntimeFunctionName(getNodeDetails),
};

truncate.toString = () => `function ${names.truncate}(string, characterLimit) {
  const Util = { ${Util.truncate} };
  return Util.truncate(string, characterLimit);
}`;

/** @type {string} */
const getNodeLabelRawString = getNodeLabel.toString();
getNodeLabel.toString = () => `function ${names.getNodeLabel}(element) {
  ${truncate};
  return (${getNodeLabelRawString})(element);
}`;

/** @type {string} */
const getOuterHTMLSnippetRawString = getOuterHTMLSnippet.toString();
// eslint-disable-next-line max-len
getOuterHTMLSnippet.toString = () => `function ${names.getOuterHTMLSnippet}(element, ignoreAttrs = [], snippetCharacterLimit = 500) {
  ${truncate};
  return (${getOuterHTMLSnippetRawString})(element, ignoreAttrs, snippetCharacterLimit);
}`;

/** @type {string} */
const getNodeDetailsRawString = getNodeDetails.toString();
getNodeDetails.toString = () => `function ${names.getNodeDetails}(element) {
  ${truncate};
  ${getNodePath};
  ${getNodeSelector};
  ${getBoundingClientRect};
  ${getOuterHTMLSnippetRawString};
  ${getNodeLabelRawString};
  return (${getNodeDetailsRawString})(element);
}`;

export const pageFunctions = {
  wrapRuntimeEvalErrorInBrowser,
  getElementsInDocument,
  getOuterHTMLSnippet,
  computeBenchmarkIndex,
  getNodeDetails,
  getNodePath,
  getNodeSelector,
  getNodeLabel,
  isPositionFixed,
  wrapRequestIdleCallback,
  getBoundingClientRect,
  truncate,
  esbuildFunctionWrapperString,
  getRuntimeFunctionName,
};
