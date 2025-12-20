/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @fileoverview Checks to see if the images used on the page are larger than
 *   their display sizes. The audit will list all images that are larger than
 *   their display size with DPR (a 1000px wide image displayed as a
 *   500px high-res image on a Retina display is 100% used);
 *   However, the audit will only fail pages that use images that have waste
 *   beyond a particular byte threshold.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const Sentry = require('../../lib/sentry.js');
const URL = require('../../lib/url-shim.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to resize images to match the display dimensions. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Properly size images',
  /** Description of a Lighthouse audit that tells the user *why* they need to serve appropriately sized images. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description:
  'Serve images that are appropriately-sized to save cellular data ' +
  'and improve load time. ' +
  '[Learn more](https://web.dev/uses-responsive-images).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 2048;

class UsesResponsiveImages extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-responsive-images',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['ImageElements', 'ViewportDimensions', 'devtoolsLogs', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts.ImageElement} image
   * @param {LH.Artifacts.ViewportDimensions} ViewportDimensions
   * @return {null|Error|LH.Audit.ByteEfficiencyItem};
   */
  static computeWaste(image, ViewportDimensions) {
    // Nothing can be done without network info.
    if (!image.resourceSize) {
      return null;
    }

    let usedPixels = image.displayedWidth * image.displayedHeight *
      Math.pow(ViewportDimensions.devicePixelRatio, 2);
    // If the image has 0 dimensions, it's probably hidden/offscreen, so we'll be as forgiving as possible
    // and assume it's the size of two viewports. See https://github.com/GoogleChrome/lighthouse/issues/7236
    if (!usedPixels) {
      const viewportWidth = ViewportDimensions.innerWidth;
      const viewportHeight = ViewportDimensions.innerHeight * 2;
      const imageAspectRatio = image.naturalWidth / image.naturalHeight;
      const viewportAspectRatio = viewportWidth / viewportHeight;
      let usedViewportWidth = viewportWidth;
      let usedViewportHeight = viewportHeight;
      if (imageAspectRatio > viewportAspectRatio) {
        usedViewportHeight = viewportWidth / imageAspectRatio;
      } else {
        usedViewportWidth = viewportHeight * imageAspectRatio;
      }

      usedPixels = usedViewportWidth * usedViewportHeight *
        Math.pow(ViewportDimensions.devicePixelRatio, 2);
    }

    const url = URL.elideDataURI(image.src);
    const actualPixels = image.naturalWidth * image.naturalHeight;
    const wastedRatio = 1 - (usedPixels / actualPixels);
    const totalBytes = image.resourceSize;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    if (!Number.isFinite(wastedRatio)) {
      return new Error(`Invalid image sizing information ${url}`);
    }

    return {
      url,
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
   */
  static audit_(artifacts) {
    const images = artifacts.ImageElements;
    const ViewportDimensions = artifacts.ViewportDimensions;

    /** @type {string[]} */
    const warnings = [];
    /** @type {Map<string, LH.Audit.ByteEfficiencyItem>} */
    const resultsMap = new Map();
    for (const image of images) {
      // Ignore images without resource size information.
      // Give SVG a free pass because creating a "responsive" SVG is of questionable value.
      // Ignore CSS images because it's difficult to determine what is a spritesheet,
      // and the reward-to-effort ratio for responsive CSS images is quite low https://css-tricks.com/responsive-images-css/.
      if (!image.resourceSize || image.mimeType === 'image/svg+xml' || image.isCss) {
        continue;
      }

      const processed = UsesResponsiveImages.computeWaste(image, ViewportDimensions);
      if (!processed) continue;

      if (processed instanceof Error) {
        warnings.push(processed.message);
        Sentry.captureException(processed, {tags: {audit: this.meta.id}, level: 'warning'});
        continue;
      }

      // Don't warn about an image that was later used appropriately
      const existing = resultsMap.get(processed.url);
      if (!existing || existing.wastedBytes > processed.wastedBytes) {
        resultsMap.set(processed.url, processed);
      }
    }

    const items = Array.from(resultsMap.values())
        .filter(item => item.wastedBytes > IGNORE_THRESHOLD_IN_BYTES);

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

module.exports = UsesResponsiveImages;
module.exports.UIStrings = UIStrings;
