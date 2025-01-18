/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
  * @fileoverview Determines optimized gzip/br/deflate filesizes for all responses by
  *   checking the content-encoding header.
  */


import {Buffer} from 'buffer';
import {gzip} from 'zlib';

import log from 'lighthouse-logger';

import BaseGatherer from '../../base-gatherer.js';
import UrlUtils from '../../../lib/url-utils.js';
import {NetworkRequest} from '../../../lib/network-request.js';
import DevtoolsLog from '../devtools-log.js';
import {fetchResponseBodyFromCache} from '../../driver/network.js';
import {NetworkRecords} from '../../../computed/network-records.js';

const CHROME_EXTENSION_PROTOCOL = 'chrome-extension:';
const binaryMimeTypes = ['image', 'audio', 'video'];
/** @type {LH.Crdp.Network.ResourceType[]} */
const textResourceTypes = [
  NetworkRequest.TYPES.Document,
  NetworkRequest.TYPES.Script,
  NetworkRequest.TYPES.Stylesheet,
  NetworkRequest.TYPES.XHR,
  NetworkRequest.TYPES.Fetch,
  NetworkRequest.TYPES.EventSource,
];

class ResponseCompression extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  /**
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {LH.Artifacts['ResponseCompression']}
   */
  static filterUnoptimizedResponses(networkRecords) {
    /** @type {LH.Artifacts['ResponseCompression']} */
    const unoptimizedResponses = [];

    networkRecords.forEach(record => {
      if (record.sessionTargetType !== 'page') return;

      const mimeType = record.mimeType;
      const resourceType = record.resourceType || NetworkRequest.TYPES.Other;
      const resourceSize = record.resourceSize;

      const isBinaryResource = mimeType && binaryMimeTypes.some(type => mimeType.startsWith(type));
      const isTextResource = !isBinaryResource && textResourceTypes.includes(resourceType);
      const isChromeExtensionResource = record.url.startsWith(CHROME_EXTENSION_PROTOCOL);

      if (!isTextResource || !resourceSize || !record.finished ||
        isChromeExtensionResource || !record.transferSize || record.statusCode === 304) {
        return;
      }

      if (!NetworkRequest.isContentEncoded(record)) {
        unoptimizedResponses.push({
          requestId: record.requestId,
          url: record.url,
          mimeType: mimeType,
          transferSize: record.transferSize,
          resourceSize: resourceSize,
          gzipSize: 0,
        });
      }
    });

    return unoptimizedResponses;
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {Promise<LH.Artifacts['ResponseCompression']>}
   */
  async getCompressibleRecords(context, networkRecords) {
    const session = context.driver.defaultSession;
    const textRecords = ResponseCompression.filterUnoptimizedResponses(networkRecords);

    return Promise.all(textRecords.map(record => {
      return fetchResponseBodyFromCache(session, record.requestId).then(content => {
        // if we don't have any content, gzipSize is already set to 0
        if (!content) {
          return record;
        }

        return new Promise((resolve, reject) => {
          return gzip(content, (err, res) => {
            if (err) {
              return reject(err);
            }

            // get gzip size
            record.gzipSize = Buffer.byteLength(res, 'utf8');

            resolve(record);
          });
        });
      }).catch(err => {
        const isExpectedError = err?.message?.includes('No resource with given identifier found');
        if (!isExpectedError) {
          err.extra = {url: UrlUtils.elideDataURI(record.url)};
          throw err;
        }

        log.error('ResponseCompression', err.message);
        record.gzipSize = undefined;
        return record;
      });
    }));
  }

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['ResponseCompression']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    return this.getCompressibleRecords(context, networkRecords);
  }
}

export default ResponseCompression;
