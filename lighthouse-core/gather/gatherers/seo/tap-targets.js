/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document, window, getComputedStyle, getElementsInDocument, Node, getNodePath, getNodeSelector, getNodeLabel */

const Gatherer = require('../gatherer.js');
const pageFunctions = require('../../../lib/page-functions.js');
const {
  rectContains,
  getRectArea,
  getRectCenterPoint,
  getLargestRect,
} = require('../../../lib/rect-helpers.js');

const TARGET_SELECTORS = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'option',
  '[role=button]',
  '[role=checkbox]',
  '[role=link]',
  '[role=menuitem]',
  '[role=menuitemcheckbox]',
  '[role=menuitemradio]',
  '[role=option]',
  '[role=scrollbar]',
  '[role=slider]',
  '[role=spinbutton]',
];
const tapTargetsSelector = TARGET_SELECTORS.join(',');

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
/* istanbul ignore next */
function elementIsVisible(element) {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

/**
 * @param {Element} element
 * @returns {LH.Artifacts.Rect[]}
 */
/* istanbul ignore next */
function getClientRects(element) {
  const clientRects = Array.from(
    element.getClientRects()
  ).map(clientRect => {
    // Contents of DOMRect get lost when returned from Runtime.evaluate call,
    // so we convert them to plain objects.
    const {width, height, left, top, right, bottom} = clientRect;
    return {width, height, left, top, right, bottom};
  });

  for (const child of element.children) {
    clientRects.push(...getClientRects(child));
  }

  return clientRects;
}

/**
 * @param {Element} element
 * @returns {boolean}
 */
/* istanbul ignore next */
function elementHasAncestorTapTarget(element) {
  if (!element.parentElement) {
    return false;
  }
  if (element.parentElement.matches(tapTargetsSelector)) {
    return true;
  }
  return elementHasAncestorTapTarget(element.parentElement);
}

/**
 * @param {Element} element
 */
/* istanbul ignore next */
function hasTextNodeSiblingsFormingTextBlock(element) {
  if (!element.parentElement) {
    return false;
  }

  const parentElement = element.parentElement;

  const nodeText = element.textContent || '';
  const parentText = parentElement.textContent || '';
  if (parentText.length - nodeText.length < 5) {
    // Parent text mostly consists of this node, so the parent
    // is not a text block container
    return false;
  }

  for (const sibling of element.parentElement.childNodes) {
    if (sibling === element) {
      continue;
    }
    const siblingTextContent = (sibling.textContent || '').trim();
    // Only count text in text nodes so that a series of e.g. buttons isn't counted
    // as a text block.
    // This works reasonably well, but means we miss text blocks where all text is e.g.
    // wrapped in spans
    if (sibling.nodeType === Node.TEXT_NODE && siblingTextContent.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Check if element is in a block of text, such as paragraph with a bunch of links in it.
 * Makes a reasonable guess, but for example gets it wrong if the element is surrounded by other
 * HTML elements instead of direct text nodes.
 * @param {Element} element
 * @returns {boolean}
 */
/* istanbul ignore next */
function elementIsInTextBlock(element) {
  const {display} = getComputedStyle(element);
  if (display !== 'inline' && display !== 'inline-block') {
    return false;
  }

  if (hasTextNodeSiblingsFormingTextBlock(element)) {
    return true;
  } else if (element.parentElement) {
    return elementIsInTextBlock(element.parentElement);
  } else {
    return false;
  }
}

/**
 * @param {string} str
 * @param {number} maxLength
 * @return {string}
 */
/* istanbul ignore next */
function truncate(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * @param {Element} el
 * @param {{x: number, y: number}} elCenterPoint
 */
/* istanbul ignore next */
function elementCenterIsAtZAxisTop(el, elCenterPoint) {
  const viewportHeight = window.innerHeight;
  const targetScrollY = Math.floor(elCenterPoint.y / viewportHeight) * viewportHeight;
  if (window.scrollY !== targetScrollY) {
    window.scrollTo(0, targetScrollY);
  }

  const topEl = document.elementFromPoint(
    elCenterPoint.x,
    elCenterPoint.y - window.scrollY
  );

  return topEl === el || el.contains(topEl);
}

/**
 * Finds all position sticky/absolute elements on the page and adds a class
 * that disables pointer events on them.
 * @returns {() => void} - undo function to re-enable pointer events
 */
/* istanbul ignore next */
function disableFixedAndStickyElementPointerEvents() {
  const className = 'lighthouse-disable-pointer-events';
  const styleTag = document.createElement('style');
  styleTag.textContent = `.${className} { pointer-events: none !important }`;
  document.body.appendChild(styleTag);

  document.querySelectorAll('*').forEach(el => {
    const position = getComputedStyle(el).position;
    if (position === 'fixed' || position === 'sticky') {
      el.classList.add(className);
    }
  });

  return function undo() {
    Array.from(document.getElementsByClassName(className)).forEach(el => {
      el.classList.remove(className);
    });
    styleTag.remove();
  };
}

/**
 * @returns {LH.Artifacts.TapTarget[]}
 */
/* istanbul ignore next */
function gatherTapTargets() {
  /** @type {LH.Artifacts.TapTarget[]} */
  const targets = [];

  // Capture element positions relative to the top of the page
  window.scrollTo(0, 0);

  /** @type {HTMLElement[]} */
  // @ts-ignore - getElementsInDocument put into scope via stringification
  const tapTargetElements = getElementsInDocument(tapTargetsSelector);

  /** @type {{
    tapTargetElement: Element,
    clientRects: ClientRect[]
  }[]} */
  const tapTargetsWithClientRects = [];
  tapTargetElements.forEach(tapTargetElement => {
    // Filter out tap targets that are likely to cause false failures:
    if (elementHasAncestorTapTarget(tapTargetElement)) {
      // This is usually intentional, either the tap targets trigger the same action
      // or there's a child with a related action (like a delete button for an item)
      return;
    }
    if (elementIsInTextBlock(tapTargetElement)) {
      // Links inside text blocks cause a lot of failures, and there's also an exception for them
      // in the Web Content Accessibility Guidelines https://www.w3.org/TR/WCAG21/#target-size
      return;
    }
    if (!elementIsVisible(tapTargetElement)) {
      return;
    }

    tapTargetsWithClientRects.push({
      tapTargetElement,
      clientRects: getClientRects(tapTargetElement),
    });
  });

  // Disable pointer events so that tap targets below them don't get
  // detected as non-tappable (they are tappable, just not while the viewport
  // is at the current scroll position)
  const reenableFixedAndStickyElementPointerEvents = disableFixedAndStickyElementPointerEvents();

  /** @type {{
    tapTargetElement: Element,
    visibleClientRects: ClientRect[]
  }[]} */
  const tapTargetsWithVisibleClientRects = [];
  // We use separate loop here to get visible client rects because that involves
  // scrolling around the page for elementCenterIsAtZAxisTop, which would affect the
  // client rect positions.
  tapTargetsWithClientRects.forEach(({tapTargetElement, clientRects}) => {
    // Filter out empty client rects
    let visibleClientRects = clientRects.filter(cr => cr.width !== 0 && cr.height !== 0);

    // Filter out client rects that are invisible, e.g because they are in a position absolute element
    // with a lower z-index than the main content.
    // This will also filter out all position fixed or sticky tap targets elements because we disable pointer
    // events on them before running this. That's the correct behavior because whether a position fixed/stick
    // element overlaps with another tap target depends on the scroll position.
    visibleClientRects = visibleClientRects.filter(rect => {
      // Just checking the center can cause false failures for large partially hidden tap targets,
      // but that should be a rare edge case
      const rectCenterPoint = getRectCenterPoint(rect);
      return elementCenterIsAtZAxisTop(tapTargetElement, rectCenterPoint);
    });

    if (visibleClientRects.length > 0) {
      tapTargetsWithVisibleClientRects.push({
        tapTargetElement,
        visibleClientRects,
      });
    }
  });

  for (const {tapTargetElement, visibleClientRects} of tapTargetsWithVisibleClientRects) {
    targets.push({
      clientRects: visibleClientRects,
      snippet: truncate(tapTargetElement.outerHTML, 300),
      // @ts-ignore - getNodePath put into scope via stringification
      path: getNodePath(tapTargetElement),
      // @ts-ignore - getNodeSelector put into scope via stringification
      selector: getNodeSelector(tapTargetElement),
      // @ts-ignore - getNodeLabel put into scope via stringification
      nodeLabel: getNodeLabel(tapTargetElement),
      href: /** @type {HTMLAnchorElement} */(tapTargetElement)['href'] || '',
    });
  }

  reenableFixedAndStickyElementPointerEvents();

  return targets;
}

class TapTargets extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.TapTarget[]>} All visible tap targets with their positions and sizes
   */
  afterPass(passContext) {
    const expression = `(function() {
      const tapTargetsSelector = "${tapTargetsSelector}";
      ${pageFunctions.getElementsInDocumentString};
      ${disableFixedAndStickyElementPointerEvents.toString()};
      ${elementIsVisible.toString()};
      ${elementHasAncestorTapTarget.toString()};
      ${elementCenterIsAtZAxisTop.toString()}
      ${truncate.toString()};
      ${getClientRects.toString()};
      ${hasTextNodeSiblingsFormingTextBlock.toString()};
      ${elementIsInTextBlock.toString()};
      ${getRectArea.toString()};
      ${getLargestRect.toString()};
      ${getRectCenterPoint.toString()};
      ${rectContains.toString()};
      ${pageFunctions.getNodePathString};
      ${pageFunctions.getNodeSelectorString};
      ${pageFunctions.getNodeLabelString};
      ${gatherTapTargets.toString()};

      return gatherTapTargets();
    })()`;

    return passContext.driver.evaluateAsync(expression, {useIsolation: true});
  }
}

module.exports = TapTargets;
