/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/*
 * @fileoverview This audit determines if the images used are sufficiently larger
 * than JPEG compressed images without metadata at quality 85.
 */


import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import UrlUtils from '../../lib/url-utils.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to encode images with optimization (better compression). This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Efficiently encode images',
  /** Description of a Lighthouse audit that tells the user *why* they need to efficiently encode images. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Optimized images load faster and consume less cellular data. ' +
  '[Learn how to efficiently encode images](https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 4096;

class UsesOptimizedImages extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-optimized-images',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 2,
      requiredArtifacts: ['OptimizedImages', 'ImageElements', 'GatherContext', 'devtoolsLogs',
        'traces', 'URL'],
    };
  }

  /**
   * @param {{originalSize: number, jpegSize: number}} image
   * @return {{bytes: number, percent: number}}
   */
  static computeSavings(image) {
    const bytes = image.originalSize - image.jpegSize;
    const percent = 100 * bytes / image.originalSize;
    return {bytes, percent};
  }

  /**
   * @param {{naturalWidth: number, naturalHeight: number}} imageElement
   * @return {number}
   */
  static estimateJPEGSizeFromDimensions(imageElement) {
    const totalPixels = imageElement.naturalWidth * imageElement.naturalHeight;
    // Even JPEGs with lots of detail can usually be compressed down to <1 byte per pixel
    // Using 4:2:2 subsampling already gets an uncompressed bitmap to 2 bytes per pixel.
    // The compression ratio for JPEG is usually somewhere around 10:1 depending on content, so
    // 8:1 is a reasonable expectation for web content which is 1.5MB for a 6MP image.
    const expectedBytesPerPixel = 2 * 1 / 8;
    return Math.round(totalPixels * expectedBytesPerPixel);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {import('./byte-efficiency-audit.js').ByteEfficiencyProduct}
   */
  static audit_(artifacts) {
    const pageURL = artifacts.URL.finalDisplayedUrl;
    const images = artifacts.OptimizedImages;
    const imageElements = artifacts.ImageElements;
    /** @type {Map<string, LH.Artifacts.ImageElement>} */
    const imageElementsByURL = new Map();
    imageElements.forEach(img => imageElementsByURL.set(img.src, img));

    /** @type {Array<{node?: LH.Audit.Details.NodeValue, url: string, fromProtocol: boolean, isCrossOrigin: boolean, totalBytes: number, wastedBytes: number}>} */
    const items = [];
    const warnings = [];
    for (const image of images) {
      const imageElement = imageElementsByURL.get(image.url);

      if (image.failed) {
        warnings.push(`Unable to decode ${UrlUtils.getURLDisplayName(image.url)}`);
        continue;
      } else if (/(jpeg|bmp)/.test(image.mimeType) === false) {
        continue;
      }

      let jpegSize = image.jpegSize;
      let fromProtocol = true;

      if (typeof jpegSize === 'undefined') {
        if (!imageElement) {
          warnings.push(`Unable to locate resource ${UrlUtils.getURLDisplayName(image.url)}`);
          continue;
        }

        // Skip if we couldn't collect natural image size information.
        if (!imageElement.naturalDimensions) continue;
        const naturalHeight = imageElement.naturalDimensions.height;
        const naturalWidth = imageElement.naturalDimensions.width;
        // If naturalHeight or naturalWidth are falsy, information is not valid, skip.
        if (!naturalHeight || !naturalWidth) continue;
        jpegSize =
          UsesOptimizedImages.estimateJPEGSizeFromDimensions({naturalHeight, naturalWidth});
        fromProtocol = false;
      }

      if (image.originalSize < jpegSize + IGNORE_THRESHOLD_IN_BYTES) continue;

      const url = UrlUtils.elideDataURI(image.url);
      const isCrossOrigin = !UrlUtils.originsMatch(pageURL, image.url);
      const jpegSavings = UsesOptimizedImages.computeSavings({...image, jpegSize});

      items.push({
        node: imageElement ? ByteEfficiencyAudit.makeNodeItem(imageElement.node) : undefined,
        url,
        fromProtocol,
        isCrossOrigin,
        totalBytes: image.originalSize,
        wastedBytes: jpegSavings.bytes,
      });
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnResourceSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    return {
      warnings,
      items,
      headings,
    };
  }
}

export default UsesOptimizedImages;
export {UIStrings};
