/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview This audit determines if the images could be smaller when compressed with WebP.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const URL = require('../../lib/url-shim.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to serve images in newer and more efficient image formats in order to enhance the performance of a page. A non-modern image format was designed 20+ years ago. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Serve images in next-gen formats',
  /** Description of a Lighthouse audit that tells the user *why* they should use newer and more efficient image formats. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Image formats like JPEG 2000, JPEG XR, and WebP often provide better ' +
    'compression than PNG or JPEG, which means faster downloads and less data consumption. ' +
    '[Learn more](https://web.dev/uses-webp-images).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 8192;

class UsesWebPImages extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-webp-images',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['OptimizedImages', 'devtoolsLogs', 'traces', 'URL', 'ImageElements'],
    };
  }

  /**
   * @param {{originalSize: number, webpSize: number}} image
   * @return {{bytes: number, percent: number}}
   */
  static computeSavings(image) {
    const bytes = image.originalSize - image.webpSize;
    const percent = 100 * bytes / image.originalSize;
    return {bytes, percent};
  }

  /**
   * @param {LH.Artifacts.ImageElement} imageElement
   * @return {number}
   */
  static estimateWebPSizeFromDimensions(imageElement) {
    const totalPixels = imageElement.naturalWidth * imageElement.naturalHeight;
    // See uses-optimized-images for the rationale behind our 2 byte-per-pixel baseline and
    // JPEG compression ratio of 8:1.
    // WebP usually gives ~20% additional savings on top of that, so we will use 10:1.
    // This is quite pessimistic as their study shows a photographic compression ratio of ~29:1.
    // https://developers.google.com/speed/webp/docs/webp_lossless_alpha_study#results
    const expectedBytesPerPixel = 2 * 1 / 10;
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

    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    const warnings = [];
    for (const image of images) {
      if (image.failed) {
        warnings.push(`Unable to decode ${URL.getURLDisplayName(image.url)}`);
        continue;
      }

      let webpSize = image.webpSize;
      let fromProtocol = true;

      if (typeof webpSize === 'undefined') {
        const imageElement = imageElementsByURL.get(image.url);
        if (!imageElement) {
          warnings.push(`Unable to locate resource ${URL.getURLDisplayName(image.url)}`);
          continue;
        }

        webpSize = UsesWebPImages.estimateWebPSizeFromDimensions(imageElement);
        fromProtocol = false;
      }

      if (image.originalSize < webpSize + IGNORE_THRESHOLD_IN_BYTES) continue;

      const url = URL.elideDataURI(image.url);
      const isCrossOrigin = !URL.originsMatch(pageURL, image.url);
      const webpSavings = UsesWebPImages.computeSavings({...image, webpSize: webpSize});

      items.push({
        url,
        fromProtocol,
        isCrossOrigin,
        totalBytes: image.originalSize,
        wastedBytes: webpSavings.bytes,
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

module.exports = UsesWebPImages;
module.exports.UIStrings = UIStrings;
