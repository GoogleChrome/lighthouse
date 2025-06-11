/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Checks to see if the aspect ratio of the images used on
 *   the page are equal to the aspect ratio of their display sizes. The
 *   audit will list all images that don't match with their display size
 *   aspect ratio.
 */


import {Audit} from './audit.js';
import UrlUtils from '../lib/url-utils.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the aspect ratios of all images on the page. This descriptive title is shown to users when all images use correct aspect ratios. */
  title: 'Displays images with correct aspect ratio',
  /** Title of a Lighthouse audit that provides detail on the aspect ratios of all images on the page. This descriptive title is shown to users when not all images use correct aspect ratios. */
  failureTitle: 'Displays images with incorrect aspect ratio',
  /** Description of a Lighthouse audit that tells the user why they should maintain the correct aspect ratios for all images. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Image display dimensions should match natural aspect ratio. ' +
    '[Learn more about image aspect ratio](https://developer.chrome.com/docs/lighthouse/best-practices/image-aspect-ratio/).',
  /**  Label for a column in a data table; entries in the column will be the numeric aspect ratio of an image as displayed in a web page. */
  columnDisplayed: 'Aspect Ratio (Displayed)',
  /**  Label for a column in a data table; entries in the column will be the numeric aspect ratio of the raw (actual) image. */
  columnActual: 'Aspect Ratio (Actual)',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const THRESHOLD_PX = 2;

/** @typedef {Required<LH.Artifacts.ImageElement>} WellDefinedImage */

class ImageAspectRatio extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'image-aspect-ratio',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['ImageElements'],
    };
  }

  /**
   * @param {WellDefinedImage} image
   * @return {{url: string, node: LH.Audit.Details.NodeValue, displayedAspectRatio: string, actualAspectRatio: string, doRatiosMatch: boolean}}
   */
  static computeAspectRatios(image) {
    const url = UrlUtils.elideDataURI(image.src);
    const actualAspectRatio = image.naturalDimensions.width / image.naturalDimensions.height;
    const displayedAspectRatio = image.displayedWidth / image.displayedHeight;

    const targetDisplayHeight = image.displayedWidth / actualAspectRatio;
    const targetDisplayWidth = image.displayedHeight * actualAspectRatio;

    // Small rounding errors in aspect ratio can lead to large differences in target width/height
    // if the aspect ratio is close to 0.
    //
    // In these cases, we should compare the smaller dimension because any rounding errors will
    // affect that dimension less.
    const doRatiosMatch = targetDisplayHeight < targetDisplayWidth
      ? Math.abs(targetDisplayHeight - image.displayedHeight) < THRESHOLD_PX
      : Math.abs(targetDisplayWidth - image.displayedWidth) < THRESHOLD_PX;

    return {
      url,
      node: Audit.makeNodeItem(image.node),
      displayedAspectRatio: `${image.displayedWidth} x ${image.displayedHeight}
        (${displayedAspectRatio.toFixed(2)})`,
      actualAspectRatio: `${image.naturalDimensions.width} x ${image.naturalDimensions.height}
        (${actualAspectRatio.toFixed(2)})`,
      doRatiosMatch,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const images = artifacts.ImageElements;

    /** @type {Array<{url: string, node: LH.Audit.Details.NodeValue, displayedAspectRatio: string, actualAspectRatio: string, doRatiosMatch: boolean}>} */
    const results = [];
    images.filter(image => {
      // - filter out css background images since we don't have a reliable way to tell if it's a
      //   sprite sheet, repeated for effect, etc
      // - filter out images that don't have following properties:
      //   networkRecord, width, height, `object-fit` property
      // - filter all svgs as they have no natural dimensions to audit
      // - filter out images that have falsy naturalWidth or naturalHeight
      return !image.isCss &&
        UrlUtils.guessMimeType(image.src) !== 'image/svg+xml' &&
        image.naturalDimensions &&
        image.naturalDimensions.height > 5 &&
        image.naturalDimensions.width > 5 &&
        image.displayedWidth &&
        image.displayedHeight &&
        image.computedStyles.objectFit === 'fill';
    }).forEach(image => {
      const wellDefinedImage = /** @type {WellDefinedImage} */ (image);
      const processed = ImageAspectRatio.computeAspectRatios(wellDefinedImage);

      if (!processed.doRatiosMatch) results.push(processed);
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'displayedAspectRatio', valueType: 'text', label: str_(UIStrings.columnDisplayed)},
      {key: 'actualAspectRatio', valueType: 'text', label: str_(UIStrings.columnActual)},
    ];

    return {
      score: Number(results.length === 0),
      details: Audit.makeTableDetails(headings, results),
    };
  }
}

export default ImageAspectRatio;
export {UIStrings};
