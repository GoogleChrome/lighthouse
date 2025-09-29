/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
  * @fileoverview Determines optimized jpeg/webp filesizes for all same-origin and dataURI images
  */

import log from 'lighthouse-logger';

import BaseGatherer from '../../base-gatherer.js';
import UrlUtils from '../../../lib/url-utils.js';
import {NetworkRequest} from '../../../lib/network-request.js';
import {Sentry} from '../../../lib/sentry.js';
import {NetworkRecords} from '../../../computed/network-records.js';
import DevtoolsLog from '../devtools-log.js';

// Image encoding can be slow and we don't want to spend forever on it.
// Cap our encoding to 5 seconds, anything after that will be estimated.
const MAX_TIME_TO_SPEND_ENCODING = 5000;
// Cap our image file size at 2MB, anything bigger than that will be estimated.
const MAX_RESOURCE_SIZE_TO_ENCODE = 2000 * 1024;

const JPEG_QUALITY = 0.92;
const WEBP_QUALITY = 0.85;

const MINIMUM_IMAGE_SIZE = 4096; // savings of <4 KiB will be ignored in the audit anyway

const IMAGE_REGEX = /^image\/((x|ms|x-ms)-)?(png|bmp|jpeg)$/;

/** @typedef {{requestId: string, url: string, mimeType: string, resourceSize: number}} SimplifiedNetworkRecord */

class OptimizedImages extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  constructor() {
    super();
    this._encodingStartAt = 0;
  }

  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Array<SimplifiedNetworkRecord>}
   */
  static filterImageRequests(networkRecords) {
    /** @type {Set<string>} */
    const seenUrls = new Set();
    return networkRecords.reduce((prev, record) => {
      // Skip records that we've seen before, never finished, or came from OOPIFs/web workers.
      if (seenUrls.has(record.url) || !record.finished || record.sessionTargetType !== 'page') {
        return prev;
      }

      seenUrls.add(record.url);
      const isOptimizableImage = record.resourceType === NetworkRequest.TYPES.Image &&
        IMAGE_REGEX.test(record.mimeType);

      const actualResourceSize = NetworkRequest.getResourceSizeOnNetwork(record);
      if (isOptimizableImage && actualResourceSize > MINIMUM_IMAGE_SIZE) {
        prev.push({
          requestId: record.requestId,
          url: record.url,
          mimeType: record.mimeType,
          resourceSize: actualResourceSize,
        });
      }

      return prev;
    }, /** @type {Array<SimplifiedNetworkRecord>} */ ([]));
  }

  /**
   * @param {LH.Gatherer.ProtocolSession} session
   * @param {string} requestId
   * @param {'jpeg'|'webp'} encoding Either webp or jpeg.
   * @return {Promise<LH.Crdp.Audits.GetEncodedResponseResponse>}
   */
  _getEncodedResponse(session, requestId, encoding) {
    requestId = NetworkRequest.getRequestIdForBackend(requestId);

    const quality = encoding === 'jpeg' ? JPEG_QUALITY : WEBP_QUALITY;
    const params = {requestId, encoding, quality, sizeOnly: true};
    return session.sendCommand('Audits.getEncodedResponse', params);
  }

  /**
   * @param {LH.Gatherer.ProtocolSession} session
   * @param {SimplifiedNetworkRecord} networkRecord
   * @return {Promise<{originalSize: number, jpegSize?: number, webpSize?: number}>}
   */
  async calculateImageStats(session, networkRecord) {
    const originalSize = networkRecord.resourceSize;
    // Once we've hit our execution time limit or when the image is too big, don't try to re-encode it.
    // Images in this execution path will fallback to byte-per-pixel heuristics on the audit side.
    if (Date.now() - this._encodingStartAt > MAX_TIME_TO_SPEND_ENCODING ||
        originalSize > MAX_RESOURCE_SIZE_TO_ENCODE) {
      return {originalSize, jpegSize: undefined, webpSize: undefined};
    }

    const jpegData = await this._getEncodedResponse(session, networkRecord.requestId, 'jpeg');
    const webpData = await this._getEncodedResponse(session, networkRecord.requestId, 'webp');

    return {
      originalSize,
      jpegSize: jpegData.encodedSize,
      webpSize: webpData.encodedSize,
    };
  }

  /**
   * @param {LH.Gatherer.ProtocolSession} session
   * @param {Array<SimplifiedNetworkRecord>} imageRecords
   * @return {Promise<LH.Artifacts['OptimizedImages']>}
   */
  async computeOptimizedImages(session, imageRecords) {
    this._encodingStartAt = Date.now();

    /** @type {LH.Artifacts['OptimizedImages']} */
    const results = [];

    for (const record of imageRecords) {
      try {
        const stats = await this.calculateImageStats(session, record);
        /** @type {LH.Artifacts.OptimizedImage} */
        const image = {failed: false, ...stats, ...record};
        results.push(image);
      } catch (err) {
        log.warn('optimized-images', err.message, record.url);

        // Track this with Sentry since these errors aren't surfaced anywhere else, but we don't
        // want to tank the entire run due to a single image.
        Sentry.captureException(err, {
          tags: {gatherer: 'OptimizedImages'},
          extra: {imageUrl: UrlUtils.elideDataURI(record.url)},
          level: 'warning',
        });

        /** @type {LH.Artifacts.OptimizedImageError} */
        const imageError = {failed: true, errMsg: err.message, ...record};
        results.push(imageError);
      }
    }

    return results;
  }

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['OptimizedImages']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    const imageRecords = OptimizedImages
      .filterImageRequests(networkRecords)
      .sort((a, b) => b.resourceSize - a.resourceSize);

    return await this.computeOptimizedImages(context.driver.defaultSession, imageRecords);
  }
}

export default OptimizedImages;
