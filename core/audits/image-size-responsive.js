/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Checks to see if the size of the visible images used on
 *   the page are large enough with respect to the pixel ratio. The
 *   audit will list all visible images that are too small.
 */


import {Audit} from './audit.js';
import UrlUtils from '../lib/url-utils.js';
import * as i18n from '../lib/i18n/i18n.js';

/** @typedef {LH.Artifacts.ImageElement & Required<Pick<LH.Artifacts.ImageElement, 'naturalDimensions'>>} ImageWithNaturalDimensions */

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the size of visible images on the page. This descriptive title is shown to users when all images have correct sizes. */
  title: 'Serves images with appropriate resolution',
  /** Title of a Lighthouse audit that provides detail on the size of visible images on the page. This descriptive title is shown to users when not all images have correct sizes. */
  failureTitle: 'Serves images with low resolution',
  /** Description of a Lighthouse audit that tells the user why they should maintain an appropriate size for all images. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Image natural dimensions should be proportional to the display size and the ' +
    'pixel ratio to maximize image clarity. ' +
    '[Learn how to provide responsive images](https://web.dev/articles/serve-responsive-images).',
  /**  Label for a column in a data table; entries in the column will be a string representing the displayed size of the image. */
  columnDisplayed: 'Displayed size',
  /**  Label for a column in a data table; entries in the column will be a string representing the actual size of the image. */
  columnActual: 'Actual size',
  /**  Label for a column in a data table; entries in the column will be a string representing the expected size of the image. */
  columnExpected: 'Expected size',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

// Factors used to allow for smaller effective density.
// A factor of 1 means the actual device pixel density will be used.
// A factor of 0.5, means half the density is required. For example if the device pixel ratio is 3,
// then the images should have at least a density of 1.5.
const SMALL_IMAGE_FACTOR = 1.0;
const LARGE_IMAGE_FACTOR = 0.75;

// An image has must have both its dimensions lower or equal to the threshold in order to be
// considered SMALL.
const SMALL_IMAGE_THRESHOLD = 64;

/** @typedef {{url: string, node: LH.Audit.Details.NodeValue, displayedSize: string, actualSize: string, actualPixels: number, expectedSize: string, expectedPixels: number}} Result */

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
 * @param {{top: number, bottom: number, left: number, right: number}} imageRect
 * @param {{innerWidth: number, innerHeight: number}} viewportDimensions
 * @return {boolean}
 */
function isSmallerThanViewport(imageRect, viewportDimensions) {
  return (
    (imageRect.bottom - imageRect.top) <= viewportDimensions.innerHeight &&
    (imageRect.right - imageRect.left) <= viewportDimensions.innerWidth
  );
}

/**
 * @param {LH.Artifacts.ImageElement} image
 * @return {boolean}
 */
function isCandidate(image) {
  /** image-rendering solution for pixel art scaling.
   * https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look
  */
  const artisticImageRenderingValues = ['pixelated', 'crisp-edges'];
  // https://html.spec.whatwg.org/multipage/images.html#pixel-density-descriptor
  const densityDescriptorRegex = / \d+(\.\d+)?x/;
  if (image.displayedWidth <= 1 || image.displayedHeight <= 1) {
    return false;
  }
  if (
    !image.naturalDimensions ||
    !image.naturalDimensions.width ||
    !image.naturalDimensions.height
  ) {
    return false;
  }
  if (UrlUtils.guessMimeType(image.src) === 'image/svg+xml') {
    return false;
  }
  if (image.isCss) {
    return false;
  }
  if (image.computedStyles.objectFit !== 'fill') {
    return false;
  }
  // Check if pixel art scaling is used.
  if (artisticImageRenderingValues.includes(image.computedStyles.imageRendering)) {
    return false;
  }
  // Check if density descriptor is used.
  if (densityDescriptorRegex.test(image.srcset)) {
    return false;
  }
  return true;
}

/**
 * Type check to ensure that the ImageElement has natural dimensions.
 *
 * @param {LH.Artifacts.ImageElement} image
 * @return {image is ImageWithNaturalDimensions}
 */
function imageHasNaturalDimensions(image) {
  return !!image.naturalDimensions;
}

/**
 * @param {ImageWithNaturalDimensions} image
 * @param {number} DPR
 * @return {boolean}
 */
function imageHasRightSize(image, DPR) {
  const [expectedWidth, expectedHeight] =
      allowedImageSize(image.displayedWidth, image.displayedHeight, DPR);
  return image.naturalDimensions.width >= expectedWidth &&
    image.naturalDimensions.height >= expectedHeight;
}

/**
 * @param {ImageWithNaturalDimensions} image
 * @param {number} DPR
 * @return {Result}
 */
function getResult(image, DPR) {
  const [expectedWidth, expectedHeight] =
      expectedImageSize(image.displayedWidth, image.displayedHeight, DPR);
  return {
    url: UrlUtils.elideDataURI(image.src),
    node: Audit.makeNodeItem(image.node),
    displayedSize: `${image.displayedWidth} x ${image.displayedHeight}`,
    actualSize: `${image.naturalDimensions.width} x ${image.naturalDimensions.height}`,
    actualPixels: image.naturalDimensions.width * image.naturalDimensions.height,
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
  const width = Math.ceil(quantizeDpr(DPR) * displayedWidth);
  const height = Math.ceil(quantizeDpr(DPR) * displayedHeight);
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
  /** @type {Result[]} */
  const deduplicated = [];
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
      .filter(imageHasNaturalDimensions)
      .filter(image => !imageHasRightSize(image, DPR))
      .filter(image => isVisible(image.clientRect, artifacts.ViewportDimensions))
      .filter(image => isSmallerThanViewport(image.clientRect, artifacts.ViewportDimensions))
      .map(image => getResult(image, DPR));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'displayedSize', valueType: 'text', label: str_(UIStrings.columnDisplayed)},
      {key: 'actualSize', valueType: 'text', label: str_(UIStrings.columnActual)},
      {key: 'expectedSize', valueType: 'text', label: str_(UIStrings.columnExpected)},
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
 * This is to relax the required size of the image.
 * There's strong evidence that 3 DPR images are not perceived to be significantly better to mobile users than
 * 2 DPR images. The additional high byte cost (3x images are ~225% the file size of 2x images) makes this practice
 * difficult to recommend.
 *
 * Human minimum visual acuity angle = 0.016 degrees (see Sun Microsystems paper)
 * Typical phone operating distance from eye = 12 in
 *
 *        A
 *        _
 *       \ | B
 *        \|
 *         θ
 * A = minimum observable pixel size = ?
 * B = viewing distance = 12 in
 * θ = human minimum visual acuity angle = 0.016 degrees
 *
 * tan θ = A / B ---- Solve for A
 * A = tan (0.016 degrees) * B = 0.00335 in
 *
 * Moto G4 display width = 2.7 in
 * Moto G4 horizontal 2x resolution = 720 pixels
 * Moto G4 horizontal 3x resolution = 1080 pixels
 *
 * Moto G4 1x pixel size = 2.7 / 360 = 0.0075 in
 * Moto G4 2x pixel size = 2.7 / 720 = 0.00375 in
 * Moto G4 3x pixel size = 2.7 / 1080 = 0.0025 in
 *
 * Wasted additional pixels in 3x image = (.00335 - .0025) / (.00375 - .0025) = 68% waste
 *
 *
 * @see https://www.swift.ac.uk/about/files/vision.pdf
 * @param {number} dpr
 * @return {number}
 */
function quantizeDpr(dpr) {
  if (dpr >= 2) {
    return 2;
  }
  if (dpr >= 1.5) {
    return 1.5;
  }
  return 1.0;
}

export default ImageSizeResponsive;
export {UIStrings};
