/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document, window, getComputedStyle, Node, HTMLElement, HTMLAnchorElement */

const FRGatherer = require('../../../fraggle-rock/gather/base-gatherer.js');
const {getNodeDetails, getElementsInDocument} = require('../../../lib/page-functions.js');
const {getRectCenterPoint} = require('../../../lib/rect-helpers.js');

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
 * @param {Element} element
 * @return {boolean}
 */
/* c8 ignore start */
function elementIsVisible(element) {
  const hasOffsetSize = element instanceof HTMLElement ?
      !!(element.offsetWidth || element.offsetHeight) : false;

  return hasOffsetSize || !!element.getClientRects().length;
}
/* c8 ignore stop */

/**
 * @param {Element} element
 * @return {LH.Artifacts.Rect[]}
 */
/* c8 ignore start */
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
/* c8 ignore stop */

/**
 * @param {Element} element
 * @param {string} tapTargetsSelector
 * @return {boolean}
 */
/* c8 ignore start */
function elementHasAncestorTapTarget(element, tapTargetsSelector) {
  if (!element.parentElement) {
    return false;
  }
  if (element.parentElement.matches(tapTargetsSelector)) {
    return true;
  }
  return elementHasAncestorTapTarget(element.parentElement, tapTargetsSelector);
}
/* c8 ignore stop */

/**
 * @param {Element} element
 */
/* c8 ignore start */
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
/* c8 ignore stop */

/**
 * Check if element is in a block of text, such as paragraph with a bunch of links in it.
 * Makes a reasonable guess, but for example gets it wrong if the element is surrounded by other
 * HTML elements instead of direct text nodes.
 * @param {Element} element
 * @return {boolean}
 */
/* c8 ignore start */
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
/* c8 ignore stop */

/**
 * @param {Element} el
 * @param {{x: number, y: number}} elCenterPoint
 */
/* c8 ignore start */
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
/* c8 ignore stop */

/**
 * Finds all position sticky/absolute elements on the page and adds a class
 * that disables pointer events on them.
 * @param {string} className
 * @return {() => void} - undo function to re-enable pointer events
 */
/* c8 ignore start */
function disableFixedAndStickyElementPointerEvents(className) {
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
  };
}
/* c8 ignore stop */

/**
 * @param {string} tapTargetsSelector
 * @param {string} className
 * @return {LH.Artifacts.TapTarget[]}
 */
/* c8 ignore start */
function gatherTapTargets(tapTargetsSelector, className) {
  /** @type {LH.Artifacts.TapTarget[]} */
  const targets = [];

  // Capture element positions relative to the top of the page
  window.scrollTo(0, 0);

  /** @type {Element[]} */
  const tapTargetElements = getElementsInDocument(tapTargetsSelector);

  /** @type {{
    tapTargetElement: Element,
    clientRects: ClientRect[]
  }[]} */
  const tapTargetsWithClientRects = [];
  tapTargetElements.forEach(tapTargetElement => {
    // Filter out tap targets that are likely to cause false failures:
    if (elementHasAncestorTapTarget(tapTargetElement, tapTargetsSelector)) {
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
  const reenableFixedAndStickyElementPointerEvents =
    disableFixedAndStickyElementPointerEvents(className);

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
    const href = tapTargetElement instanceof HTMLAnchorElement ? tapTargetElement.href : '';
    targets.push({
      clientRects: visibleClientRects,
      href,
      node: getNodeDetails(tapTargetElement),
    });
  }

  reenableFixedAndStickyElementPointerEvents();

  return targets;
}
/* c8 ignore stop */

class TapTargets extends FRGatherer {
  constructor() {
    super();
    /**
     * This needs to be in the constructor.
     * https://github.com/GoogleChrome/lighthouse/issues/12134
     * @type {LH.Gatherer.GathererMeta}
     */
    this.meta = {
      supportedModes: ['snapshot', 'navigation'],
    };
  }

  /**
   * @param {LH.Gatherer.FRProtocolSession} session
   * @param {string} className
   * @return {Promise<string>}
   */
  async addStyleRule(session, className) {
    const frameTreeResponse = await session.sendCommand('Page.getFrameTree');
    const {styleSheetId} = await session.sendCommand('CSS.createStyleSheet', {
      frameId: frameTreeResponse.frameTree.frame.id,
    });
    const ruleText = `.${className} { pointer-events: none !important }`;
    await session.sendCommand('CSS.setStyleSheetText', {
      styleSheetId,
      text: ruleText,
    });
    return styleSheetId;
  }

  /**
   * @param {LH.Gatherer.FRProtocolSession} session
   * @param {string} styleSheetId
   */
  async removeStyleRule(session, styleSheetId) {
    await session.sendCommand('CSS.setStyleSheetText', {
      styleSheetId,
      text: '',
    });
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<LH.Artifacts.TapTarget[]>} All visible tap targets with their positions and sizes
   */
  async getArtifact(passContext) {
    const session = passContext.driver.defaultSession;
    await session.sendCommand('DOM.enable');
    await session.sendCommand('CSS.enable');

    const className = 'lighthouse-disable-pointer-events';
    const styleSheetId = await this.addStyleRule(session, className);

    const tapTargets = await passContext.driver.executionContext.evaluate(gatherTapTargets, {
      args: [tapTargetsSelector, className],
      useIsolation: true,
      deps: [
        getNodeDetails,
        getElementsInDocument,
        disableFixedAndStickyElementPointerEvents,
        elementIsVisible,
        elementHasAncestorTapTarget,
        elementCenterIsAtZAxisTop,
        getClientRects,
        hasTextNodeSiblingsFormingTextBlock,
        elementIsInTextBlock,
        getRectCenterPoint,
      ],
    });

    await this.removeStyleRule(session, styleSheetId);

    await session.sendCommand('CSS.disable');
    await session.sendCommand('DOM.disable');

    return tapTargets;
  }
}

module.exports = TapTargets;
