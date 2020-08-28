/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

/* global window document Node ShadowRoot __nativeError:readonly */

/**
 * Helper functions that are passed by `toString()` by Driver to be evaluated in target page.
 */

/**
 * The `exceptionDetails` provided by the debugger protocol does not contain the useful
 * information such as name, message, and stack trace of the error when it's wrapped in a
 * promise. Instead, map to a successful object that contains this information.
 * @param {string|Error} err The error to convert
 */
/* istanbul ignore next */
function wrapRuntimeEvalErrorInBrowser(err) {
  err = err || new __nativeError();
  const fallbackMessage = typeof err === 'string' ? err : 'unknown error';

  return {
    __failedInBrowser: true,
    name: err.name || 'Error',
    message: err.message || fallbackMessage,
    stack: err.stack || (new __nativeError()).stack,
  };
}

/**
 * Used by _waitForCPUIdle and executed in the context of the page, updates the ____lastLongTask
 * property on window to the end time of the last long task.
 */
/* istanbul ignore next */
function registerPerformanceObserverInPage() {
  window.____lastLongTask = window.__perfNow();
  const observer = new window.PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    for (const entry of entries) {
      if (entry.entryType === 'longtask') {
        const taskEnd = entry.startTime + entry.duration;
        window.____lastLongTask = Math.max(window.____lastLongTask, taskEnd);
      }
    }
  });

  observer.observe({entryTypes: ['longtask']});
  // HACK(COMPAT): A PerformanceObserver will be GC'd if there are no more references to it, so attach it to
  // window to ensure we still receive longtask notifications. See https://crbug.com/742530.
  // For an example test of this behavior see https://gist.github.com/patrickhulce/69d8bed1807e762218994b121d06fea6.
  //   FIXME COMPAT: This hack isn't neccessary as of Chrome 62.0.3176.0
  //   https://bugs.chromium.org/p/chromium/issues/detail?id=742530#c7
  window.____lhPerformanceObserver = observer;
}

/**
 * Used by _waitForCPUIdle and executed in the context of the page, returns time since last long task.
 */
/* istanbul ignore next */
function checkTimeSinceLastLongTask() {
  // Wait for a delta before returning so that we're sure the PerformanceObserver
  // has had time to register the last longtask
  return new window.__nativePromise(resolve => {
    const timeoutRequested = window.__perfNow() + 50;

    setTimeout(() => {
      // Double check that a long task hasn't happened since setTimeout
      const timeoutFired = window.__perfNow();
      const timeSinceLongTask = timeoutFired - timeoutRequested < 50 ?
          timeoutFired - window.____lastLongTask : 0;
      resolve(timeSinceLongTask);
    }, 50);
  });
}

/**
 * @param {string=} selector Optional simple CSS selector to filter nodes on.
 *     Combinators are not supported.
 * @return {Array<HTMLElement>}
 */
/* istanbul ignore next */
function getElementsInDocument(selector) {
  const realMatchesFn = window.__ElementMatches || window.Element.prototype.matches;
  /** @type {Array<HTMLElement>} */
  const results = [];

  /** @param {NodeListOf<HTMLElement>} nodes */
  const _findAllElements = nodes => {
    for (let i = 0, el; el = nodes[i]; ++i) {
      if (!selector || realMatchesFn.call(el, selector)) {
        results.push(el);
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
/* istanbul ignore next */
function getOuterHTMLSnippet(element, ignoreAttrs = [], snippetCharacterLimit = 500) {
  const ATTRIBUTE_CHAR_LIMIT = 75;
  try {
    // ShadowRoots are sometimes passed in; use their hosts' outerHTML.
    if (element instanceof ShadowRoot) {
      element = element.host;
    }

    const clone = element.cloneNode();
    ignoreAttrs.forEach(attribute =>{
      clone.removeAttribute(attribute);
    });
    let charCount = 0;
    for (const attributeName of clone.getAttributeNames()) {
      if (charCount > snippetCharacterLimit) {
        clone.removeAttribute(attributeName);
      } else {
        let attributeValue = clone.getAttribute(attributeName);
        if (attributeValue.length > ATTRIBUTE_CHAR_LIMIT) {
          attributeValue = attributeValue.slice(0, ATTRIBUTE_CHAR_LIMIT - 1) + '…';
          clone.setAttribute(attributeName, attributeValue);
        }
        charCount += attributeName.length + attributeValue.length;
      }
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
 */
/* istanbul ignore next */
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
      let s = ''; // eslint-disable-line no-unused-vars
      for (let j = 0; j < 10000; j++) s += 'a';

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

    while (Date.now() - start < 500) {
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
 *   https://github.com/ChromeDevTools/devtools-frontend/blob/7a2e162ddefd/front_end/sdk/DOMModel.js#L530-L552
 * TODO: Doesn't handle frames or shadow roots...
 * @param {Node} node
 */
/* istanbul ignore next */
function getNodePath(node) {
  /** @param {Node} node */
  function getNodeIndex(node) {
    let index = 0;
    let prevNode;
    while (prevNode = node.previousSibling) {
      node = prevNode;
      // skip empty text nodes
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length === 0) continue;
      index++;
    }
    return index;
  }

  const path = [];
  while (node && node.parentNode) {
    const index = getNodeIndex(node);
    path.push([index, node.nodeName]);
    node = node.parentNode;
  }
  path.reverse();
  return path.join(',');
}

/**
 * @param {Element} node
 * @return {string}
 */
/* istanbul ignore next */
function getNodeSelector(node) {
  /**
   * @param {Element} node
   */
  function getSelectorPart(node) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += '#' + node.id;
    } else if (node.classList.length > 0) {
      part += '.' + node.classList[0];
    }
    return part;
  }

  const parts = [];
  while (parts.length < 4) {
    parts.unshift(getSelectorPart(node));
    if (!node.parentElement) {
      break;
    }
    node = node.parentElement;
    if (node.tagName === 'HTML') {
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
/* istanbul ignore next */
function isPositionFixed(element) {
  /**
   * @param {HTMLElement} element
   * @param {string} attr
   * @return {string}
   */
  function getStyleAttrValue(element, attr) {
    // Check style before computedStyle as computedStyle is expensive.
    return element.style[attr] || window.getComputedStyle(element)[attr];
  }

  // Position fixed/sticky has no effect in case when document does not scroll.
  const htmlEl = document.querySelector('html');
  if (htmlEl.scrollHeight <= htmlEl.clientHeight ||
      !['scroll', 'auto', 'visible'].includes(getStyleAttrValue(htmlEl, 'overflowY'))) {
    return false;
  }

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
 * Falls back to the tagName if no useful label is found.
 * @param {HTMLElement} node
 * @return {string|null}
 */
/* istanbul ignore next */
function getNodeLabel(node) {
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
    return str.slice(0, maxLength - 1) + '…';
  }

  const tagName = node.tagName.toLowerCase();
  // html and body content is too broad to be useful, since they contain all page content
  if (tagName !== 'html' && tagName !== 'body') {
    const nodeLabel = node.innerText || node.getAttribute('alt') || node.getAttribute('aria-label');
    if (nodeLabel) {
      return truncate(nodeLabel, 80);
    } else {
      // If no useful label was found then try to get one from a child.
      // E.g. if an a tag contains an image but no text we want the image alt/aria-label attribute.
      const nodeToUseForLabel = node.querySelector('[alt], [aria-label]');
      if (nodeToUseForLabel) {
        return getNodeLabel(/** @type {HTMLElement} */ (nodeToUseForLabel));
      }
    }
  }
  return tagName;
}

/**
 * @param {HTMLElement} element
 * @param {LH.Artifacts.Rect}
 */
/* istanbul ignore next */
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

/*
 * RequestIdleCallback shim that calculates the remaining deadline time in order to avoid a potential lighthouse
 * penalty for tests run with simulated throttling. Reduces the deadline time to (50 - safetyAllowance) / cpuSlowdownMultiplier to
 * ensure a long task is very unlikely if using the API correctly.
 * @param {number} cpuSlowdownMultiplier
 * @return {null}
 */
/* istanbul ignore next */
function wrapRequestIdleCallback(cpuSlowdownMultiplier) {
  const safetyAllowanceMs = 10;
  const maxExecutionTimeMs = Math.floor((50 - safetyAllowanceMs) / cpuSlowdownMultiplier);
  const nativeRequestIdleCallback = window.requestIdleCallback;
  window.requestIdleCallback = (cb) => {
    const cbWrap = (deadline, timeout) => {
      const start = Date.now();
      deadline.__timeRemaining = deadline.timeRemaining;
      deadline.timeRemaining = () => {
        return Math.min(
          deadline.__timeRemaining(), Math.max(0, maxExecutionTimeMs - (Date.now() - start))
        );
      };
      deadline.timeRemaining.toString = () => {
        return 'function timeRemaining() { [native code] }';
      };
      cb(deadline, timeout);
    };
    return nativeRequestIdleCallback(cbWrap);
  };
  window.requestIdleCallback.toString = () => {
    return 'function requestIdleCallback() { [native code] }';
  };
}

module.exports = {
  wrapRuntimeEvalErrorInBrowserString: wrapRuntimeEvalErrorInBrowser.toString(),
  registerPerformanceObserverInPageString: registerPerformanceObserverInPage.toString(),
  checkTimeSinceLastLongTaskString: checkTimeSinceLastLongTask.toString(),
  getElementsInDocumentString: getElementsInDocument.toString(),
  getOuterHTMLSnippetString: getOuterHTMLSnippet.toString(),
  getOuterHTMLSnippet: getOuterHTMLSnippet,
  computeBenchmarkIndex: computeBenchmarkIndex,
  computeBenchmarkIndexString: computeBenchmarkIndex.toString(),
  getNodePathString: getNodePath.toString(),
  getNodeSelectorString: getNodeSelector.toString(),
  getNodeSelector: getNodeSelector,
  getNodeLabel: getNodeLabel,
  getNodeLabelString: getNodeLabel.toString(),
  isPositionFixedString: isPositionFixed.toString(),
  wrapRequestIdleCallbackString: wrapRequestIdleCallback.toString(),
  getBoundingClientRectString: getBoundingClientRect.toString(),
};
