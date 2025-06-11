/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
  * @fileoverview Gathers all images used on the page with their src, size,
  *   and attribute information. Executes script in the context of the page.
  */


import log from 'lighthouse-logger';

import BaseGatherer from '../base-gatherer.js';
import {pageFunctions} from '../../lib/page-functions.js';
import * as FontSize from './seo/font-size.js';

/* global window, getElementsInDocument, Image, getNodeDetails, ShadowRoot */

/** @param {Element} element */
/* c8 ignore start */
function getClientRect(element) {
  const clientRect = element.getBoundingClientRect();
  return {
    // Just grab the DOMRect properties we want, excluding x/y/width/height
    top: clientRect.top,
    bottom: clientRect.bottom,
    left: clientRect.left,
    right: clientRect.right,
  };
}
/* c8 ignore stop */

/**
 * If an image is within `picture`, the `picture` element's css position
 * is what we want to collect, since that position is relevant to CLS.
 * @param {Element} element
 * @param {CSSStyleDeclaration} computedStyle
 */
/* c8 ignore start */
function getPosition(element, computedStyle) {
  if (element.parentElement && element.parentElement.tagName === 'PICTURE') {
    const parentStyle = window.getComputedStyle(element.parentElement);
    return parentStyle.getPropertyValue('position');
  }
  return computedStyle.getPropertyValue('position');
}
/* c8 ignore stop */

/**
 * @param {Array<Element>} allElements
 * @return {Array<LH.Artifacts.ImageElement>}
 */
/* c8 ignore start */
function getHTMLImages(allElements) {
  const allImageElements = /** @type {Array<HTMLImageElement>} */ (allElements.filter(element => {
    return element.localName === 'img';
  }));

  return allImageElements.map(element => {
    const computedStyle = window.getComputedStyle(element);
    const isPicture = !!element.parentElement && element.parentElement.tagName === 'PICTURE';
    const canTrustNaturalDimensions = !isPicture && !element.srcset;
    return {
      // currentSrc used over src to get the url as determined by the browser
      // after taking into account srcset/media/sizes/etc.
      src: element.currentSrc,
      srcset: element.srcset,
      displayedWidth: element.width,
      displayedHeight: element.height,
      clientRect: getClientRect(element),
      attributeWidth: element.getAttribute('width'),
      attributeHeight: element.getAttribute('height'),
      naturalDimensions: canTrustNaturalDimensions ?
        {width: element.naturalWidth, height: element.naturalHeight} :
        undefined,
      cssRules: undefined, // this will get overwritten below
      computedStyles: {
        position: getPosition(element, computedStyle),
        objectFit: computedStyle.getPropertyValue('object-fit'),
        imageRendering: computedStyle.getPropertyValue('image-rendering'),
      },
      isCss: false,
      isPicture,
      loading: element.loading,
      isInShadowDOM: element.getRootNode() instanceof ShadowRoot,
      fetchPriority: element.fetchPriority,
      // @ts-expect-error - getNodeDetails put into scope via stringification
      node: getNodeDetails(element),
    };
  });
}
/* c8 ignore stop */

/**
 * @param {Array<Element>} allElements
 * @return {Array<LH.Artifacts.ImageElement>}
 */
/* c8 ignore start */
function getCSSImages(allElements) {
  // Chrome normalizes background image style from getComputedStyle to be an absolute URL in quotes.
  // Only match basic background-image: url("http://host/image.jpeg") declarations
  const CSS_URL_REGEX = /^url\("([^"]+)"\)$/;

  /** @type {Array<LH.Artifacts.ImageElement>} */
  const images = [];

  for (const element of allElements) {
    const style = window.getComputedStyle(element);
    // If the element didn't have a CSS background image, we're not interested.
    if (!style.backgroundImage || !CSS_URL_REGEX.test(style.backgroundImage)) continue;

    const imageMatch = style.backgroundImage.match(CSS_URL_REGEX);
    // @ts-expect-error test() above ensures that there is a match.
    const url = imageMatch[1];

    images.push({
      src: url,
      srcset: '',
      displayedWidth: element.clientWidth,
      displayedHeight: element.clientHeight,
      clientRect: getClientRect(element),
      attributeWidth: null,
      attributeHeight: null,
      naturalDimensions: undefined,
      cssEffectiveRules: undefined,
      computedStyles: {
        position: getPosition(element, style),
        objectFit: '',
        imageRendering: style.getPropertyValue('image-rendering'),
      },
      isCss: true,
      isPicture: false,
      isInShadowDOM: element.getRootNode() instanceof ShadowRoot,
      // @ts-expect-error - getNodeDetails put into scope via stringification
      node: getNodeDetails(element),
    });
  }

  return images;
}
/* c8 ignore stop */

/** @return {Array<LH.Artifacts.ImageElement>} */
/* c8 ignore start */
function collectImageElementInfo() {
  /** @type {Array<Element>} */
  // @ts-expect-error - added by getElementsInDocumentFnString
  const allElements = getElementsInDocument();
  return getHTMLImages(allElements).concat(getCSSImages(allElements));
}
/* c8 ignore stop */

/**
 * @param {string} url
 * @return {Promise<{naturalWidth: number, naturalHeight: number}>}
 */
/* c8 ignore start */
function determineNaturalSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('error', _ => reject(new Error('determineNaturalSize failed img load')));
    img.addEventListener('load', () => {
      resolve({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
    });

    img.src = url;
  });
}
/* c8 ignore stop */

/**
 * @param {Partial<Pick<LH.Crdp.CSS.CSSStyle, 'cssProperties'>>|undefined} rule
 * @param {string} property
 * @return {string | undefined}
 */
function findSizeDeclaration(rule, property) {
  if (!rule || !rule.cssProperties) return;

  const definedProp = rule.cssProperties.find(({name}) => name === property);
  if (!definedProp) return;

  return definedProp.value;
}

/**
 * Finds the most specific directly matched CSS font-size rule from the list.
 *
 * @param {Array<LH.Crdp.CSS.RuleMatch>|undefined} matchedCSSRules
 * @param {string} property
 * @return {string | undefined}
 */
function findMostSpecificCSSRule(matchedCSSRules, property) {
  /** @param {LH.Crdp.CSS.CSSStyle} declaration */
  const isDeclarationofInterest = (declaration) => findSizeDeclaration(declaration, property);
  const rule = FontSize.findMostSpecificMatchedCSSRule(matchedCSSRules, isDeclarationofInterest);
  if (!rule) return;

  return findSizeDeclaration(rule, property);
}

/**
 * @param {LH.Crdp.CSS.GetMatchedStylesForNodeResponse} matched CSS rules}
 * @param {string} property
 * @return {string | null}
 */
function getEffectiveSizingRule({attributesStyle, inlineStyle, matchedCSSRules}, property) {
  // CSS sizing can't be inherited.
  // We only need to check inline & matched styles.
  // Inline styles have highest priority.
  const inlineRule = findSizeDeclaration(inlineStyle, property);
  if (inlineRule) return inlineRule;

  const attributeRule = findSizeDeclaration(attributesStyle, property);
  if (attributeRule) return attributeRule;

  // Rules directly referencing the node come next.
  const matchedRule = findMostSpecificCSSRule(matchedCSSRules, property);
  if (matchedRule) return matchedRule;

  return null;
}

/**
 * @param {LH.Artifacts.ImageElement} element
 * @return {number}
 */
function getPixelArea(element) {
  if (element.naturalDimensions) {
    return element.naturalDimensions.height * element.naturalDimensions.width;
  }
  return element.displayedHeight * element.displayedWidth;
}

class ImageElements extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  constructor() {
    super();
    /** @type {Map<string, {naturalWidth: number, naturalHeight: number}>} */
    this._naturalSizeCache = new Map();
  }

  /**
   * @param {LH.Gatherer.Driver} driver
   * @param {LH.Artifacts.ImageElement} element
   */
  async fetchElementWithSizeInformation(driver, element) {
    const url = element.src;
    let size = this._naturalSizeCache.get(url);
    if (!size) {
      try {
        // We don't want this to take forever, 250ms should be enough for images that are cached
        driver.defaultSession.setNextProtocolTimeout(250);
        size = await driver.executionContext.evaluate(determineNaturalSize, {
          args: [url],
          useIsolation: true,
        });
        this._naturalSizeCache.set(url, size);
      } catch (_) {
        // determineNaturalSize fails on invalid images, which we treat as non-visible
      }
    }

    if (!size) return;
    element.naturalDimensions = {width: size.naturalWidth, height: size.naturalHeight};
  }

  /**
   * Images might be sized via CSS. In order to compute unsized-images failures, we need to collect
   * matched CSS rules to see if this is the case.
   * @url http://go/dwoqq (googlers only)
   * @param {LH.Gatherer.ProtocolSession} session
   * @param {string} devtoolsNodePath
   * @param {LH.Artifacts.ImageElement} element
   */
  async fetchSourceRules(session, devtoolsNodePath, element) {
    try {
      const {nodeId} = await session.sendCommand('DOM.pushNodeByPathToFrontend', {
        path: devtoolsNodePath,
      });
      if (!nodeId) return;

      const matchedRules = await session.sendCommand('CSS.getMatchedStylesForNode', {
        nodeId: nodeId,
      });
      const width = getEffectiveSizingRule(matchedRules, 'width');
      const height = getEffectiveSizingRule(matchedRules, 'height');
      const aspectRatio = getEffectiveSizingRule(matchedRules, 'aspect-ratio');
      element.cssEffectiveRules = {width, height, aspectRatio};
    } catch (err) {
      if (/No node.*found/.test(err.message)) return;
      throw err;
    }
  }

  /**
   *
   * @param {LH.Gatherer.Driver} driver
   * @param {LH.Artifacts.ImageElement[]} elements
   */
  async collectExtraDetails(driver, elements) {
    // Don't do more than 5s of this expensive devtools protocol work. See #11289
    let reachedGatheringBudget = false;
    setTimeout(_ => (reachedGatheringBudget = true), 5000);
    let skippedCount = 0;

    for (const element of elements) {
      if (reachedGatheringBudget) {
        skippedCount++;
        continue;
      }

      // Need source rules to determine if sized via CSS (for unsized-images).
      if (!element.isInShadowDOM && !element.isCss) {
        await this.fetchSourceRules(driver.defaultSession, element.node.devtoolsNodePath, element);
      }
      // Images within `picture` behave strangely and natural size information isn't accurate,
      // CSS images have no natural size information at all. Try to get the actual size if we can.
      if (element.isPicture || element.isCss || element.srcset) {
        await this.fetchElementWithSizeInformation(driver, element);
      }
    }

    if (reachedGatheringBudget) {
      log.warn('ImageElements', `Reached gathering budget of 5s. Skipped extra details for ${skippedCount}/${elements.length}`); // eslint-disable-line max-len
    }
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['ImageElements']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    const executionContext = context.driver.executionContext;

    const elements = await executionContext.evaluate(collectImageElementInfo, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getElementsInDocument,
        pageFunctions.getBoundingClientRect,
        pageFunctions.getNodeDetails,
        getClientRect,
        getPosition,
        getHTMLImages,
        getCSSImages,
      ],
    });

    await Promise.all([
      session.sendCommand('DOM.enable'),
      session.sendCommand('CSS.enable'),
      session.sendCommand('DOM.getDocument', {depth: -1, pierce: true}),
    ]);

    // Spend our extra details budget on highest impact images.
    // Our best approximation of impact without network records is to use pixel area.
    elements.sort((a, b) => getPixelArea(b) - getPixelArea(a));

    await this.collectExtraDetails(context.driver, elements);

    await Promise.all([
      session.sendCommand('DOM.disable'),
      session.sendCommand('CSS.disable'),
    ]);

    return elements;
  }
}

export default ImageElements;
