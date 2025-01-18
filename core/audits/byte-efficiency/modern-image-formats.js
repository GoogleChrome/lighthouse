/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/*
 * @fileoverview This audit determines if the images could be smaller when compressed with WebP.
 */


import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import UrlUtils from '../../lib/url-utils.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to serve images in newer and more efficient image formats in order to enhance the performance of a page. A non-modern image format was designed 20+ years ago. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Serve images in next-gen formats',
  /** Description of a Lighthouse audit that tells the user *why* they should use newer and more efficient image formats. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Image formats like WebP and AVIF often provide better ' +
    'compression than PNG or JPEG, which means faster downloads and less data consumption. ' +
    '[Learn more about modern image formats](https://developer.chrome.com/docs/lighthouse/performance/uses-webp-images/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 8192;

class ModernImageFormats extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'modern-image-formats',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 3,
      requiredArtifacts: ['OptimizedImages', 'devtoolsLogs', 'traces', 'URL', 'GatherContext',
        'ImageElements'],
    };
  }

  /**
   * @param {{naturalWidth: number, naturalHeight: number}} imageElement
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
   * @param {{naturalWidth: number, naturalHeight: number}} imageElement
   * @return {number}
   */
  static estimateAvifSizeFromDimensions(imageElement) {
    const totalPixels = imageElement.naturalWidth * imageElement.naturalHeight;
    // See above for the rationale behind our 2 byte-per-pixel baseline and WebP ratio of 10:1.
    // AVIF usually gives ~20% additional savings on top of that, so we will use 12:1.
    // This is quite pessimistic as Netflix study shows a photographic compression ratio of ~40:1
    // (0.4 *bits* per pixel at SSIM 0.97).
    // https://netflixtechblog.com/avif-for-next-generation-image-coding-b1d75675fe4
    const expectedBytesPerPixel = 2 * 1 / 12;
    return Math.round(totalPixels * expectedBytesPerPixel);
  }

  /**
   * @param {{jpegSize: number | undefined, webpSize: number | undefined}} otherFormatSizes
   * @return {number|undefined}
   */
  static estimateAvifSizeFromWebPAndJpegEstimates(otherFormatSizes) {
    if (!otherFormatSizes.jpegSize || !otherFormatSizes.webpSize) return undefined;

    // AVIF saves at least ~50% on JPEG, ~20% on WebP at low quality.
    // http://downloads.aomedia.org/assets/pdf/symposium-2019/slides/CyrilConcolato_Netflix-AVIF-AOM-Research-Symposium-2019.pdf
    // https://jakearchibald.com/2020/avif-has-landed/
    // https://www.finally.agency/blog/what-is-avif-image-format
    // See https://github.com/GoogleChrome/lighthouse/issues/12295#issue-840261460 for more.
    const estimateFromJpeg = otherFormatSizes.jpegSize * 5 / 10;
    const estimateFromWebp = otherFormatSizes.webpSize * 8 / 10;
    return estimateFromJpeg / 2 + estimateFromWebp / 2;
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

    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    const warnings = [];
    for (const image of images) {
      const imageElement = imageElementsByURL.get(image.url);

      if (image.failed) {
        warnings.push(`Unable to decode ${UrlUtils.getURLDisplayName(image.url)}`);
        continue;
      }

      // Skip if the image was already using a modern format.
      if (image.mimeType === 'image/webp' || image.mimeType === 'image/avif') continue;

      const jpegSize = image.jpegSize;
      let webpSize = image.webpSize;
      let avifSize = ModernImageFormats.estimateAvifSizeFromWebPAndJpegEstimates({
        jpegSize,
        webpSize,
      });
      let fromProtocol = true;

      if (typeof webpSize === 'undefined') {
        if (!imageElement) {
          warnings.push(`Unable to locate resource ${UrlUtils.getURLDisplayName(image.url)}`);
          continue;
        }

        // Skip if we couldn't collect natural image size information.
        if (!imageElement.naturalDimensions) continue;
        const naturalHeight = imageElement.naturalDimensions.height;
        const naturalWidth = imageElement.naturalDimensions.width;
        // If naturalHeight or naturalWidth are falsy, information is not valid, skip.
        if (!naturalWidth || !naturalHeight) continue;

        webpSize = ModernImageFormats.estimateWebPSizeFromDimensions({
          naturalHeight,
          naturalWidth,
        });
        avifSize = ModernImageFormats.estimateAvifSizeFromDimensions({
          naturalHeight,
          naturalWidth,
        });
        fromProtocol = false;
      }

      if (webpSize === undefined || avifSize === undefined) continue;

      // Visible wasted bytes uses AVIF, but we still include the WebP savings in the LHR.
      const wastedWebpBytes = image.originalSize - webpSize;
      const wastedBytes = image.originalSize - avifSize;
      if (wastedBytes < IGNORE_THRESHOLD_IN_BYTES) continue;

      const url = UrlUtils.elideDataURI(image.url);
      const isCrossOrigin = !UrlUtils.originsMatch(pageURL, image.url);

      items.push({
        node: imageElement ? ByteEfficiencyAudit.makeNodeItem(imageElement.node) : undefined,
        url,
        fromProtocol,
        isCrossOrigin,
        totalBytes: image.originalSize,
        wastedBytes,
        wastedWebpBytes,
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

export default ModernImageFormats;
export {UIStrings};
