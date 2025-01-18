/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Checks to see if the images used on the page are larger than
 *   their display sizes. The audit will list all images that are larger than
 *   their display size with DPR (a 1000px wide image displayed as a
 *   500px high-res image on a Retina display is 100% used);
 *   However, the audit will only fail pages that use images that have waste
 *   beyond a particular byte threshold.
 */


import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import {NetworkRequest} from '../../lib/network-request.js';
import {ImageRecords} from '../../computed/image-records.js';
import UrlUtils from '../../lib/url-utils.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to resize images to match the display dimensions. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Properly size images',
  /** Description of a Lighthouse audit that tells the user *why* they need to serve appropriately sized images. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description:
  'Serve images that are appropriately-sized to save cellular data ' +
  'and improve load time. ' +
  '[Learn how to size images](https://developer.chrome.com/docs/lighthouse/performance/uses-responsive-images/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 4096;

// Ignore up to 12KB of waste if an effort was made with breakpoints.
const IGNORE_THRESHOLD_IN_BYTES_BREAKPOINTS_PRESENT = 12288;

class UsesResponsiveImages extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-responsive-images',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 2,
      requiredArtifacts: ['ImageElements', 'ViewportDimensions', 'GatherContext',
        'devtoolsLogs', 'traces', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts.ImageElement & {naturalWidth: number, naturalHeight: number}} image
   * @param {LH.Artifacts.ViewportDimensions} ViewportDimensions
   * @return {{width: number, height: number}};
   */
  static getDisplayedDimensions(image, ViewportDimensions) {
    if (image.displayedWidth && image.displayedHeight) {
      return {
        width: image.displayedWidth * ViewportDimensions.devicePixelRatio,
        height: image.displayedHeight * ViewportDimensions.devicePixelRatio,
      };
    }

    // If the image has 0 dimensions, it's probably hidden/offscreen, so we'll be as forgiving as possible
    // and assume it's the size of two viewports. See https://github.com/GoogleChrome/lighthouse/issues/7236
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

    return {
      width: usedViewportWidth * ViewportDimensions.devicePixelRatio,
      height: usedViewportHeight * ViewportDimensions.devicePixelRatio,
    };
  }

  /**
   * @param {LH.Artifacts.ImageElement & {naturalWidth: number, naturalHeight: number}} image
   * @param {LH.Artifacts.ViewportDimensions} ViewportDimensions
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {null|LH.Audit.ByteEfficiencyItem};
   */
  static computeWaste(image, ViewportDimensions, networkRecords) {
    const networkRecord = networkRecords.find(record => record.url === image.src);
    // Nothing can be done without network info, ignore images without resource size information.
    if (!networkRecord) {
      return null;
    }

    const displayed = this.getDisplayedDimensions(image, ViewportDimensions);
    const usedPixels = displayed.width * displayed.height;

    const url = UrlUtils.elideDataURI(image.src);
    const actualPixels = image.naturalWidth * image.naturalHeight;
    const wastedRatio = 1 - (usedPixels / actualPixels);
    const totalBytes = NetworkRequest.getResourceSizeOnNetwork(networkRecord);
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    return {
      node: ByteEfficiencyAudit.makeNodeItem(image.node),
      url,
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }


  /**
   * @param {LH.Artifacts.ImageElement} image
   * @return {number};
   */
  static determineAllowableWaste(image) {
    if (image.srcset || image.isPicture) {
      return IGNORE_THRESHOLD_IN_BYTES_BREAKPOINTS_PRESENT;
    }
    return IGNORE_THRESHOLD_IN_BYTES;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<import('./byte-efficiency-audit.js').ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords, context) {
    const images = await ImageRecords.request({
      ImageElements: artifacts.ImageElements,
      networkRecords,
    }, context);
    const ViewportDimensions = artifacts.ViewportDimensions;
    /** @type {Map<string, LH.Audit.ByteEfficiencyItem>} */
    const resultsMap = new Map();
    /** @type {Array<string>} */
    const passedImageList = [];
    for (const image of images) {
      // Give SVG a free pass because creating a "responsive" SVG is of questionable value.
      // Ignore CSS images because it's difficult to determine what is a spritesheet,
      // and the reward-to-effort ratio for responsive CSS images is quite low https://css-tricks.com/responsive-images-css/.
      if (image.mimeType === 'image/svg+xml' || image.isCss) {
        continue;
      }

      // Skip if we couldn't collect natural image size information.
      if (!image.naturalDimensions) continue;
      const naturalHeight = image.naturalDimensions.height;
      const naturalWidth = image.naturalDimensions.width;
      // If naturalHeight or naturalWidth are falsy, information is not valid, skip.
      if (!naturalWidth || !naturalHeight) continue;
      const processed =
        UsesResponsiveImages.computeWaste(
          {...image, naturalHeight, naturalWidth},
          ViewportDimensions, networkRecords
        );
      if (!processed) continue;

      // Verify the image wastes more than the minimum.
      const exceedsAllowableWaste = processed.wastedBytes > this.determineAllowableWaste(image);

      const existing = resultsMap.get(processed.url);
      // Don't warn about an image that was later used appropriately, or wastes a trivial amount of data.
      if (exceedsAllowableWaste && !passedImageList.includes(processed.url)) {
        if ((!existing || existing.wastedBytes > processed.wastedBytes)) {
          resultsMap.set(processed.url, processed);
        }
      } else {
        // Ensure this url passes for future tests.
        resultsMap.delete(processed.url);
        passedImageList.push(processed.url);
      }
    }

    const items = Array.from(resultsMap.values());

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnResourceSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    return {
      items,
      headings,
    };
  }
}

export default UsesResponsiveImages;
export {UIStrings, str_};
