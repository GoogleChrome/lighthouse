/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview This audit determines if the images used are sufficiently larger
 * than JPEG compressed images without metadata at quality 85.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const URL = require('../../lib/url-shim.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to encode images with optimization (better compression). This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Efficiently encode images',
  /** Description of a Lighthouse audit that tells the user *why* they need to efficiently encode images. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Optimized images load faster and consume less cellular data. ' +
  '[Learn more](https://web.dev/uses-optimized-images).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['OptimizedImages', 'ImageElements', 'devtoolsLogs', 'traces', 'URL'],
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
   * @param {LH.Artifacts.ImageElement} imageElement
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
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
   */
  static audit_(artifacts) {
    const pageURL = artifacts.URL.finalUrl;
    const images = artifacts.OptimizedImages;
    const imageElements = artifacts.ImageElements;
    /** @type {Map<string, LH.Artifacts.ImageElement>} */
    const imageElementsByURL = new Map();
    imageElements.forEach(img => imageElementsByURL.set(img.src, img));

    /** @type {Array<{url: string, fromProtocol: boolean, isCrossOrigin: boolean, totalBytes: number, wastedBytes: number}>} */
    const items = [];
    const warnings = [];
    for (const image of images) {
      if (image.failed) {
        warnings.push(`Unable to decode ${URL.getURLDisplayName(image.url)}`);
        continue;
      } else if (/(jpeg|bmp)/.test(image.mimeType) === false) {
        continue;
      }

      let jpegSize = image.jpegSize;
      let fromProtocol = true;

      if (typeof jpegSize === 'undefined') {
        const imageElement = imageElementsByURL.get(image.url);
        if (!imageElement) {
          warnings.push(`Unable to locate resource ${URL.getURLDisplayName(image.url)}`);
          continue;
        }

        jpegSize = UsesOptimizedImages.estimateJPEGSizeFromDimensions(imageElement);
        fromProtocol = false;
      }

      if (image.originalSize < jpegSize + IGNORE_THRESHOLD_IN_BYTES) continue;

      const url = URL.elideDataURI(image.url);
      const isCrossOrigin = !URL.originsMatch(pageURL, image.url);
      const jpegSavings = UsesOptimizedImages.computeSavings({...image, jpegSize});

      items.push({
        url,
        fromProtocol,
        isCrossOrigin,
        totalBytes: image.originalSize,
        wastedBytes: jpegSavings.bytes,
      });
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'thumbnail', label: ''},
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

module.exports = UsesOptimizedImages;
module.exports.UIStrings = UIStrings;
