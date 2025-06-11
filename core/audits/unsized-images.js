/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview
 * Audit that checks whether all images have explicit width and height.
 */


import {Audit} from './audit.js';
import * as i18n from './../lib/i18n/i18n.js';
import UrlUtils from '../lib/url-utils.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on whether all images have explicit width and height. This descriptive title is shown to users when every image has explicit width and height */
  title: 'Image elements have explicit `width` and `height`',
  /** Title of a Lighthouse audit that provides detail on whether all images have explicit width and height. This descriptive title is shown to users when one or more images does not have explicit width and height */
  failureTitle: 'Image elements do not have explicit `width` and `height`',
  /** Description of a Lighthouse audit that tells the user why they should include explicit width and height for all images. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Set an explicit width and height on image elements to reduce layout shifts and improve CLS. [Learn how to set image dimensions](https://web.dev/articles/optimize-cls#images_without_dimensions)',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class UnsizedImages extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'unsized-images',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      guidanceLevel: 4,
      requiredArtifacts: ['ImageElements'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   * An img size attribute prevents layout shifts if it is a non-negative integer (incl zero!).
   * @url https://html.spec.whatwg.org/multipage/embedded-content-other.html#dimension-attributes
   * @param {string | null} attrValue
   * @return {boolean}
   */
  static doesHtmlAttrProvideExplicitSize(attrValue) {
    if (!attrValue) return false;

    // First, superweird edge case of using the positive-sign. The spec _sorta_ says it's valid...
    // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#rules-for-parsing-integers
    //   > Otherwise, if the character is … (+): Advance position to the next character.
    //   > (The "+" is ignored, but it is not conforming.)
    // lol.  Irrelevant though b/c Chrome (at least) doesn't ignore. It rejects this as a non-conforming value.
    if (attrValue.startsWith('+')) return false;

    // parseInt isn't exactly the same as the html's spec for parsing integers, but it's close enough
    // https://tc39.es/ecma262/#sec-parseint-string-radix
    const int = parseInt(attrValue, 10);
    return int >= 0;
  }

  /**
   * An img css size property prevents layout shifts if it is defined, not empty, and not equal to 'auto'.
   * @param {string | null} property
   * @return {boolean}
   */
  static isCssPropExplicitlySet(property) {
    if (!property) return false;
    return !['auto', 'initial', 'unset', 'inherit'].includes(property);
  }

  /**
   * Images are considered sized if they have defined & valid values.
   * @param {LH.Artifacts.ImageElement} image
   * @return {boolean}
   */
  static isSizedImage(image) {
    // Perhaps we hit reachedGatheringBudget before collecting this image's cssWidth/Height
    // in fetchSourceRules. In this case, we don't have enough information to determine if it's sized.
    // We don't want to show the user a false positive, so we'll call it sized to give it as pass.
    // While this situation should only befall small-impact images, it means our analysis is incomplete. :(
    // Handwavey TODO: explore ways to avoid this.
    if (image.cssEffectiveRules === undefined) return true;

    const attrWidth = image.attributeWidth;
    const attrHeight = image.attributeHeight;
    const cssWidth = image.cssEffectiveRules.width;
    const cssHeight = image.cssEffectiveRules.height;
    const cssAspectRatio = image.cssEffectiveRules.aspectRatio;
    const htmlWidthIsExplicit = UnsizedImages.doesHtmlAttrProvideExplicitSize(attrWidth);
    const cssWidthIsExplicit = UnsizedImages.isCssPropExplicitlySet(cssWidth);
    const htmlHeightIsExplicit = UnsizedImages.doesHtmlAttrProvideExplicitSize(attrHeight);
    const cssHeightIsExplicit = UnsizedImages.isCssPropExplicitlySet(cssHeight);
    const explicitAspectRatio = UnsizedImages.isCssPropExplicitlySet(cssAspectRatio);
    const explicitWidth = htmlWidthIsExplicit || cssWidthIsExplicit;
    const explicitHeight = htmlHeightIsExplicit || cssHeightIsExplicit;
    return (explicitWidth && explicitHeight) ||
      (explicitWidth && explicitAspectRatio) ||
      (explicitHeight && explicitAspectRatio);
  }

  /**
   * @param {LH.Artifacts.ImageElement} image
   * @return {boolean}
   */
  static isNonNetworkSvg(image) {
    const isSvg = UrlUtils.guessMimeType(image.src) === 'image/svg+xml';
    const urlScheme = image.src.slice(0, image.src.indexOf(':'));
    const isNonNetwork = UrlUtils.isNonNetworkProtocol(urlScheme);
    return isSvg && isNonNetwork;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    // CSS background-images & ShadowRoot images are ignored for this audit.
    const images = artifacts.ImageElements.filter(el => !el.isCss && !el.isInShadowDOM);
    const unsizedImages = [];

    for (const image of images) {
      // Fixed images are out of document flow and won't cause layout shifts
      const isFixedImage =
        image.computedStyles.position === 'fixed' || image.computedStyles.position === 'absolute';
      if (isFixedImage) continue;

      // Non-network SVGs with dimensions don't cause layout shifts in practice, skip them.
      // See https://github.com/GoogleChrome/lighthouse/issues/11631
      if (UnsizedImages.isNonNetworkSvg(image)) continue;

      // The image was sized with HTML or CSS. Good job.
      if (UnsizedImages.isSizedImage(image)) continue;

      // Images with a 0-size bounding rect (due to hidden parent) aren't part of layout. Cool.
      const boundingRect = image.node.boundingRect;
      const isNotDisplayed = boundingRect.width === 0 && boundingRect.height === 0;
      if (isNotDisplayed) continue;

      unsizedImages.push({
        url: UrlUtils.elideDataURI(image.src),
        node: Audit.makeNodeItem(image.node),
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
    ];

    return {
      score: unsizedImages.length > 0 ? 0 : 1,
      details: Audit.makeTableDetails(headings, unsizedImages),
      metricSavings: {
        CLS: 0,
      },
    };
  }
}

export default UnsizedImages;
export {UIStrings};
