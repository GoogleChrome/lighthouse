/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
  * @fileoverview Determines optimized jpeg/webp filesizes for all same-origin and dataURI images by
  *   running the images through canvas in the browser context.
  */
'use strict';

const log = require('lighthouse-logger');
const FRGatherer = require('../../../fraggle-rock/gather/base-gatherer.js');
const URL = require('../../../lib/url-shim.js');
const NetworkRequest = require('../../../lib/network-request.js');
const Sentry = require('../../../lib/sentry.js');
const NetworkRecords = require('../../../computed/network-records.js');
const DevtoolsLog = require('../devtools-log.js');

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

class OptimizedImages extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  }

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
      // Skip records that we've seen before, never finished, or came from child targets (OOPIFS).
      if (seenUrls.has(record.url) || !record.finished || record.sessionId) {
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
   * @param {LH.Gatherer.FRProtocolSession} session
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
   * @param {LH.Gatherer.FRProtocolSession} session
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
   * @param {LH.Gatherer.FRProtocolSession} session
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
        log.warn('optimized-images', err.message);

        // Track this with Sentry since these errors aren't surfaced anywhere else, but we don't
        // want to tank the entire run due to a single image.
        Sentry.captureException(err, {
          tags: {gatherer: 'OptimizedImages'},
          extra: {imageUrl: URL.elideDataURI(record.url)},
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
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {Promise<LH.Artifacts['OptimizedImages']>}
   */
  async _getArtifact(context, networkRecords) {
    const imageRecords = OptimizedImages
      .filterImageRequests(networkRecords)
      .sort((a, b) => b.resourceSize - a.resourceSize);

    const results = await this.computeOptimizedImages(context.driver.defaultSession, imageRecords);
    const successfulResults = results.filter(result => !result.failed);
    if (results.length && !successfulResults.length) {
      throw new Error('All image optimizations failed');
    }
    return results;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['OptimizedImages']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    return this._getArtifact(context, networkRecords);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['OptimizedImages']>}
   */
  async afterPass(passContext, loadData) {
    return this._getArtifact({...passContext, dependencies: {}}, loadData.networkRecords);
  }
}

module.exports = OptimizedImages;
