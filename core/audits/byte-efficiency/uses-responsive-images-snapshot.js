/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Checks to see if the images used on the page are larger than
 *   their display sizes. The audit will list all images that are larger than
 *   their display size with DPR (a 1000px wide image displayed as a
 *   500px high-res image on a Retina display is 100% used);
 */


import {Audit} from '../audit.js';
import * as UsesResponsiveImages from './uses-responsive-images.js';
import UrlUtils from '../../lib/url-utils.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Descriptive title of a Lighthouse audit that checks if images match their displayed dimensions. This is displayed when the audit is passing. */
  title: 'Images were appropriate for their displayed size',
  /** Descriptive title of a Lighthouse audit that checks if images match their displayed dimensions. This is displayed when the audit is failing. */
  failureTitle: 'Images were larger than their displayed size',
  /** Label for a column in a data table; entries will be the dimensions of an image as it appears on the page. */
  columnDisplayedDimensions: 'Displayed dimensions',
  /** Label for a column in a data table; entries will be the dimensions of an image from it's source file. */
  columnActualDimensions: 'Actual dimensions',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

// Based on byte threshold of 4096, with 3 bytes per pixel.
const IGNORE_THRESHOLD_IN_PIXELS = 1365;

class UsesResponsiveImagesSnapshot extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-responsive-images-snapshot',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: UsesResponsiveImages.str_(UsesResponsiveImages.UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      supportedModes: ['snapshot'],
      guidanceLevel: 2,
      requiredArtifacts: ['ImageElements', 'ViewportDimensions'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    let score = 1;
    /** @type {LH.Audit.Details.TableItem[]} */
    const items = [];
    for (const image of artifacts.ImageElements) {
      // Ignore CSS images because it's difficult to determine what is a spritesheet,
      // and the reward-to-effort ratio for responsive CSS images is quite low https://css-tricks.com/responsive-images-css/.
      if (image.isCss) continue;

      if (!image.naturalDimensions) continue;
      const actual = image.naturalDimensions;
      const displayed = UsesResponsiveImages.default.getDisplayedDimensions(
        {...image, naturalWidth: actual.width, naturalHeight: actual.height},
        artifacts.ViewportDimensions
      );

      const actualPixels = actual.width * actual.height;
      const usedPixels = displayed.width * displayed.height;

      if (actualPixels <= usedPixels) continue;
      if (actualPixels - usedPixels > IGNORE_THRESHOLD_IN_PIXELS) score = 0;

      items.push({
        node: Audit.makeNodeItem(image.node),
        url: UrlUtils.elideDataURI(image.src),
        displayedDimensions: `${displayed.width}x${displayed.height}`,
        actualDimensions: `${actual.width}x${actual.height}`,
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'displayedDimensions', valueType: 'text', label: str_(UIStrings.columnDisplayedDimensions)},
      {key: 'actualDimensions', valueType: 'text', label: str_(UIStrings.columnActualDimensions)},
      /* eslint-enable max-len */
    ];

    const details = Audit.makeTableDetails(headings, items);

    return {
      score,
      details,
    };
  }
}

export default UsesResponsiveImagesSnapshot;
export {UIStrings};
