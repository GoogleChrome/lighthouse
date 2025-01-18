/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import UrlUtils from '../lib/url-utils.js';
import {makeComputedArtifact} from './computed-artifact.js';

class ImageRecords {
  /**
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   */
  static indexNetworkRecords(networkRecords) {
    return networkRecords.reduce((map, record) => {
      // An image response in newer formats is sometimes incorrectly marked as "application/octet-stream",
      // so respect the extension too.
      const isImage = /^image/.test(record.mimeType) || /\.(avif|webp)$/i.test(record.url);
      // The network record is only valid for size information if it finished with a successful status
      // code that indicates a complete image response.
      if (isImage && record.finished && record.statusCode === 200) {
        map[record.url] = record;
      }

      return map;
    }, /** @type {Record<string, LH.Artifacts.NetworkRequest>} */ ({}));
  }

  /**
   * @param {{ImageElements: LH.Artifacts['ImageElements'], networkRecords: LH.Artifacts.NetworkRequest[]}} data
   * @return {Promise<LH.Artifacts.ImageElementRecord[]>}
   */
  static async compute_(data) {
    const indexedNetworkRecords = ImageRecords.indexNetworkRecords(data.networkRecords);

    /** @type {LH.Artifacts.ImageElementRecord[]} */
    const imageRecords = [];

    for (const element of data.ImageElements) {
      const networkRecord = indexedNetworkRecords[element.src];
      const mimeType = networkRecord?.mimeType;

      // Don't change the guessed mime type if no mime type was found.
      imageRecords.push({
        ...element,
        mimeType: mimeType ? mimeType : UrlUtils.guessMimeType(element.src),
      });
    }

    // Sort (in-place) as largest images descending.
    imageRecords.sort((a, b) => {
      const aRecord = indexedNetworkRecords[a.src] || {};
      const bRecord = indexedNetworkRecords[b.src] || {};
      return bRecord.resourceSize - aRecord.resourceSize;
    });

    return imageRecords;
  }
}

const ImageRecordsComputed =
  makeComputedArtifact(ImageRecords, ['ImageElements', 'networkRecords']);
export {ImageRecordsComputed as ImageRecords};

