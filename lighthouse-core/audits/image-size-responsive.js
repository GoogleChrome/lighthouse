/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @fileoverview Checks to see if the size of the visible images used on
 *   the page are large enough with respect to the pixel ratio. The
 *   audit will list all visible images that are too small.
 */
'use strict';

const Audit = require('./audit.js');
const URL = require('../lib/url-shim.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the size of visible images on the page. This descriptive title is shown to users when all images have correct sizes. */
  title: 'Serves images with appropriate resolution',
  /** Title of a Lighthouse audit that provides detail on the size of visible images on the page. This descriptive title is shown to users when not all images have correct sizes. */
  failureTitle: 'Serves images with low resolution',
  /** Description of a Lighthouse audit that tells the user why they should maintain an appropriate size for all images. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Image natural dimensions should be proportional to the display size and the ' +
    'pixel ratio to maximize image clarity. [Learn more](https://web.dev/serve-responsive-images/).',
  /**  Label for a column in a data table; entries in the column will be a string representing the displayed size of the image. */
  columnDisplayed: 'Displayed size',
  /**  Label for a column in a data table; entries in the column will be a string representing the actual size of the image. */
  columnActual: 'Actual size',
  /**  Label for a column in a data table; entries in the column will be a string representing the expected size of the image. */
  columnExpected: 'Expected size',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

// Factors used to allow for smaller effective density.
// A factor of 1 means the actual device pixel density will be used.
// A factor of 0.5, means half the density is required. For example if the device pixel ratio is 3,
// then the images should have at least a density of 1.5.
const SMALL_IMAGE_FACTOR = 1.0;
const LARGE_IMAGE_FACTOR = 0.75;

// An image has must have both its dimensions lower or equal to the threshold in order to be
// considered SMALL.
const SMALL_IMAGE_THRESHOLD = 64;

/** @typedef {{url: string, elidedUrl: string, displayedSize: string, actualSize: string, actualPixels: number, expectedSize: string, expectedPixels: number}} Result */

/**
 * @param {{top: number, bottom: number, left: number, right: number}} imageRect
 * @param {{innerWidth: number, innerHeight: number}} viewportDimensions
 * @return {boolean}
 */
function isVisible(imageRect, viewportDimensions) {
  return (
    (imageRect.bottom - imageRect.top) * (imageRect.right - imageRect.left) > 0 &&
    imageRect.top <= viewportDimensions.innerHeight &&
    imageRect.bottom >= 0 &&
    imageRect.left <= viewportDimensions.innerWidth &&
    imageRect.right >= 0
  );
}

/**
 * @param {LH.Artifacts.ImageElement} image
 * @return {boolean}
 */
function isCandidate(image) {
  if (image.displayedWidth <= 1 || image.displayedHeight <= 1) {
    return false;
  }
  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    return false;
  }
  if (image.mimeType === 'image/svg+xml') {
    return false;
  }
  if (image.isCss) {
    return false;
  }
  if (image.usesObjectFit) {
    return false;
  }
  if (image.usesPixelArtScaling) {
    return false;
  }
  if (image.usesSrcSetDensityDescriptor) {
    return false;
  }
  return true;
}

/**
 * @param {LH.Artifacts.ImageElement} image
 * @param {number} DPR
 * @return {boolean}
 */
function imageHasRightSize(image, DPR) {
  const [expectedWidth, expectedHeight] =
      allowedImageSize(image.displayedWidth, image.displayedHeight, DPR);
  return image.naturalWidth >= expectedWidth && image.naturalHeight >= expectedHeight;
}

/**
 * @param {LH.Artifacts.ImageElement} image
 * @param {number} DPR
 * @return {Result}
 */
function getResult(image, DPR) {
  const [expectedWidth, expectedHeight] =
      expectedImageSize(image.displayedWidth, image.displayedHeight, DPR);
  return {
    url: image.src,
    elidedUrl: URL.elideDataURI(image.src),
    displayedSize: `${image.displayedWidth} x ${image.displayedHeight}`,
    actualSize: `${image.naturalWidth} x ${image.naturalHeight}`,
    actualPixels: image.naturalWidth * image.naturalHeight,
    expectedSize: `${expectedWidth} x ${expectedHeight}`,
    expectedPixels: expectedWidth * expectedHeight,
  };
}

/**
 * Compute the size an image should have given the display dimensions and pixel density in order to
 * pass the audit.
 *
 * For smaller images, typically icons, the size must be proportional to the density.
 * For larger images some tolerance is allowed as in those cases the perceived degradation is not
 * that bad.
 *
 * @param {number} displayedWidth
 * @param {number} displayedHeight
 * @param {number} DPR
 * @return {[number, number]}
 */
function allowedImageSize(displayedWidth, displayedHeight, DPR) {
  let factor = SMALL_IMAGE_FACTOR;
  if (displayedWidth > SMALL_IMAGE_THRESHOLD || displayedHeight > SMALL_IMAGE_THRESHOLD) {
    factor = LARGE_IMAGE_FACTOR;
  }
  const requiredDpr = quantizeDpr(DPR);
  const width = Math.ceil(factor * requiredDpr * displayedWidth);
  const height = Math.ceil(factor * requiredDpr * displayedHeight);
  return [width, height];
}

/**
 * Compute the size an image should have given the display dimensions and pixel density.
 *
 * @param {number} displayedWidth
 * @param {number} displayedHeight
 * @param {number} DPR
 * @return {[number, number]}
 */
function expectedImageSize(displayedWidth, displayedHeight, DPR) {
  const width = Math.ceil(DPR * displayedWidth);
  const height = Math.ceil(DPR * displayedHeight);
  return [width, height];
}

/**
 * Remove repeated entries for the same source.
 *
 * It will keep the entry with the largest expected size.
 *
 * @param {Result[]} results
 * @return {Result[]}
 */
function deduplicateResultsByUrl(results) {
  results.sort((a, b) => a.url === b.url ? 0 : (a.url < b. url ? -1 : 1));
  const deduplicated = /** @type {Result[]} */ ([]);
  for (const r of results) {
    const previousResult = deduplicated[deduplicated.length - 1];
    if (previousResult && previousResult.url === r.url) {
      // If the URL was the same, this is a duplicate. Keep the largest image.
      if (previousResult.expectedPixels < r.expectedPixels) {
        deduplicated[deduplicated.length - 1] = r;
      }
    } else {
      deduplicated.push(r);
    }
  }
  return deduplicated;
}

/**
 * Sort entries in descending order by the magnitude of the size deficit, i.e. most pressing issues listed first.
 *
 * @param {Result[]} results
 * @return {Result[]}
 */
function sortResultsBySizeDelta(results) {
  return results.sort(
      (a, b) => (b.expectedPixels - b.actualPixels) - (a.expectedPixels - a.actualPixels));
}

class ImageSizeResponsive extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'image-size-responsive',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['ImageElements', 'ViewportDimensions'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const DPR = artifacts.ViewportDimensions.devicePixelRatio;
    const results = Array
      .from(artifacts.ImageElements)
      .filter(isCandidate)
      .filter(image => !imageHasRightSize(image, DPR))
      .filter(image => isVisible(image.clientRect, artifacts.ViewportDimensions))
      .map(image => getResult(image, DPR));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'thumbnail', text: ''},
      {key: 'elidedUrl', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'displayedSize', itemType: 'text', text: str_(UIStrings.columnDisplayed)},
      {key: 'actualSize', itemType: 'text', text: str_(UIStrings.columnActual)},
      {key: 'expectedSize', itemType: 'text', text: str_(UIStrings.columnExpected)},
    ];

    const finalResults = sortResultsBySizeDelta(deduplicateResultsByUrl(results));

    return {
      score: Number(results.length === 0),
      details: Audit.makeTableDetails(headings, finalResults),
    };
  }
}

/**
 * Return a quantized version of the DPR.
 *
 * This is to relax the required size of the image, as there are some densities that are not that
 * common, and the default DPR used in some contexts by lightouse is 2.625.
 *
 * @param {number} dpr
 * @return {number}
 */
function quantizeDpr(dpr) {
  if (dpr >= 2) {
    return Math.floor(dpr);
  }
  if (dpr >= 1.5) {
    return 1.5;
  }
  return 1.0;
}

module.exports = ImageSizeResponsive;
module.exports.UIStrings = UIStrings;
