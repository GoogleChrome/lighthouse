/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const parseCacheControl = require('parse-cache-control');
const Audit = require('../audit.js');
const NetworkRequest = require('../../lib/network-request.js');
const URL = require('../../lib/url-shim.js');
const linearInterpolation = require('../../lib/statistics.js').linearInterpolation;
const i18n = require('../../lib/i18n/i18n.js');
const NetworkRecords = require('../../computed/network-records.js');

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the cache policy applies to the page's static assets. Cache refers to browser disk cache, which keeps old versions of network resources around for future use. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Uses efficient cache policy on static assets',
  /** Title of a diagnostic audit that provides details on the any page resources that could have been served with more efficient cache policies. Cache refers to browser disk cache, which keeps old versions of network resources around for future use. This imperative title is shown to users when there is a significant amount of assets served with poor cache policies. */
  failureTitle: 'Serve static assets with an efficient cache policy',
  /** Description of a Lighthouse audit that tells the user *why* they need to adopt a long cache lifetime policy. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description:
    'A long cache lifetime can speed up repeat visits to your page. ' +
    '[Learn more](https://web.dev/uses-long-cache-ttl).',
  /** [ICU Syntax] Label for the audit identifying network resources with inefficient cache values. Clicking this will expand the audit to show the resources. */
  displayValue: `{itemCount, plural,
    =1 {1 resource found}
    other {# resources found}
    }`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

// Ignore assets that have very high likelihood of cache hit
const IGNORE_THRESHOLD_IN_PERCENT = 0.925;

class CacheHeaders extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-long-cache-ttl',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs', 'traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // 50th and 25th percentiles HTTPArchive -> 50 and 75, with p10 derived from them.
      // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
      // see https://www.desmos.com/calculator/uzsyl2hbcb
      p10: 28 * 1024,
      median: 128 * 1024,
    };
  }

  /**
   * Computes the percent likelihood that a return visit will be within the cache lifetime, based on
   * Chrome UMA stats see the note below.
   * @param {number} maxAgeInSeconds
   * @return {number}
   */
  static getCacheHitProbability(maxAgeInSeconds) {
    // This array contains the hand wavy distribution of the age of a resource in hours at the time of
    // cache hit at 0th, 10th, 20th, 30th, etc percentiles. This is used to compute `wastedMs` since there
    // are clearly diminishing returns to cache duration i.e. 6 months is not 2x better than 3 months.
    // Based on UMA stats for HttpCache.StaleEntry.Validated.Age, see https://www.desmos.com/calculator/7v0qh1nzvh
    // Example: a max-age of 12 hours already covers ~50% of cases, doubling to 24 hours covers ~10% more.
    const RESOURCE_AGE_IN_HOURS_DECILES = [0, 0.2, 1, 3, 8, 12, 24, 48, 72, 168, 8760, Infinity];
    if (RESOURCE_AGE_IN_HOURS_DECILES.length !== 12) {
      throw new Error('deciles 0-10 and 1 for overflow');
    }

    const maxAgeInHours = maxAgeInSeconds / 3600;
    const upperDecileIndex = RESOURCE_AGE_IN_HOURS_DECILES.findIndex(
      decile => decile >= maxAgeInHours
    );

    // Clip the likelihood between 0 and 1
    if (upperDecileIndex === RESOURCE_AGE_IN_HOURS_DECILES.length - 1) return 1;
    if (upperDecileIndex === 0) return 0;

    // Use the two closest decile points as control points
    const upperDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex];
    const lowerDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex - 1];
    const upperDecile = upperDecileIndex / 10;
    const lowerDecile = (upperDecileIndex - 1) / 10;

    // Approximate the real likelihood with linear interpolation
    return linearInterpolation(
      lowerDecileValue,
      lowerDecile,
      upperDecileValue,
      upperDecile,
      maxAgeInHours
    );
  }

  /**
   * Return max-age if defined, otherwise expires header if defined, and null if not.
   * @param {Map<string, string>} headers
   * @param {ReturnType<typeof parseCacheControl>} cacheControl
   * @return {?number}
   */
  static computeCacheLifetimeInSeconds(headers, cacheControl) {
    if (cacheControl && cacheControl['max-age'] !== undefined) {
      return cacheControl['max-age'];
    }

    const expiresHeaders = headers.get('expires');
    if (expiresHeaders) {
      const expires = new Date(expiresHeaders).getTime();
      // Invalid expires values MUST be treated as already expired
      if (!expires) return 0;
      return Math.ceil((expires - Date.now()) / 1000);
    }

    return null;
  }

  /**
   * Given a network record, returns whether we believe the asset is cacheable, i.e. it was a network
   * request that satisifed the conditions:
   *
   *  1. Has a cacheable status code
   *  2. Has a resource type that corresponds to static assets (image, script, stylesheet, etc).
   *
   * Allowing assets with a query string is debatable, PSI considered them non-cacheable with a similar
   * caveat.
   *
   * TODO: Investigate impact in HTTPArchive, experiment with this policy to see what changes.
   *
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {boolean}
   */
  static isCacheableAsset(record) {
    const CACHEABLE_STATUS_CODES = new Set([200, 203, 206]);

    /** @type {Set<LH.Crdp.Network.ResourceType>} */
    const STATIC_RESOURCE_TYPES = new Set([
      NetworkRequest.TYPES.Font,
      NetworkRequest.TYPES.Image,
      NetworkRequest.TYPES.Media,
      NetworkRequest.TYPES.Script,
      NetworkRequest.TYPES.Stylesheet,
    ]);

    // It's not a request loaded over the network, caching makes no sense
    if (URL.NON_NETWORK_PROTOCOLS.includes(record.protocol)) return false;

    return (
      CACHEABLE_STATUS_CODES.has(record.statusCode) &&
      STATIC_RESOURCE_TYPES.has(record.resourceType || 'Other')
    );
  }

  /**
   * Returns true if headers suggest a record should not be cached for a long time.
   * @param {Map<string, string>} headers
   * @param {ReturnType<typeof parseCacheControl>} cacheControl
   * @returns {boolean}
   */
  static shouldSkipRecord(headers, cacheControl) {
    // The HTTP/1.0 Pragma header can disable caching if cache-control is not set, see https://tools.ietf.org/html/rfc7234#section-5.4
    if (!cacheControl && (headers.get('pragma') || '').includes('no-cache')) {
      return true;
    }

    // Ignore assets where policy implies they should not be cached long periods
    if (cacheControl &&
      (
        cacheControl['must-revalidate'] ||
        cacheControl['no-cache'] ||
        cacheControl['no-store'] ||
        cacheControl['private'])) {
      return true;
    }

    return false;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return NetworkRecords.request(devtoolsLogs, context).then(records => {
      const results = [];
      let queryStringCount = 0;
      let totalWastedBytes = 0;

      for (const record of records) {
        if (!CacheHeaders.isCacheableAsset(record)) continue;

        /** @type {Map<string, string>} */
        const headers = new Map();
        for (const header of record.responseHeaders || []) {
          if (headers.has(header.name.toLowerCase())) {
            const previousHeaderValue = headers.get(header.name.toLowerCase());
            headers.set(header.name.toLowerCase(),
              `${previousHeaderValue}, ${header.value}`);
          } else {
            headers.set(header.name.toLowerCase(), header.value);
          }
        }

        const cacheControl = parseCacheControl(headers.get('cache-control'));
        if (this.shouldSkipRecord(headers, cacheControl)) {
          continue;
        }

        // Ignore if cacheLifetimeInSeconds is a nonpositive number.
        let cacheLifetimeInSeconds = CacheHeaders.computeCacheLifetimeInSeconds(
          headers, cacheControl);
        if (cacheLifetimeInSeconds !== null &&
          (!Number.isFinite(cacheLifetimeInSeconds) || cacheLifetimeInSeconds <= 0)) {
          continue;
        }
        cacheLifetimeInSeconds = cacheLifetimeInSeconds || 0;

        // Ignore assets whose cache lifetime is already high enough
        const cacheHitProbability = CacheHeaders.getCacheHitProbability(cacheLifetimeInSeconds);
        if (cacheHitProbability > IGNORE_THRESHOLD_IN_PERCENT) continue;

        const url = URL.elideDataURI(record.url);
        const totalBytes = record.transferSize || 0;
        const wastedBytes = (1 - cacheHitProbability) * totalBytes;

        totalWastedBytes += wastedBytes;
        if (url.includes('?')) queryStringCount++;

        // Include cacheControl info (if it exists) per url as a diagnostic.
        /** @type {LH.Audit.Details.DebugData|undefined} */
        let debugData;
        if (cacheControl) {
          debugData = {
            type: 'debugdata',
            ...cacheControl,
          };
        }

        results.push({
          url,
          debugData,
          cacheLifetimeMs: cacheLifetimeInSeconds * 1000,
          cacheHitProbability,
          totalBytes,
          wastedBytes,
        });
      }

      results.sort((a, b) => {
        return a.cacheLifetimeMs - b.cacheLifetimeMs ||
          b.totalBytes - a.totalBytes ||
          a.url.localeCompare(b.url);
      });

      const score = Audit.computeLogNormalScore(
        {p10: context.options.p10, median: context.options.median},
        totalWastedBytes
      );

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
        // TODO(i18n): pre-compute localized duration
        {key: 'cacheLifetimeMs', itemType: 'ms', text: str_(i18n.UIStrings.columnCacheTTL),
          displayUnit: 'duration'},
        {key: 'totalBytes', itemType: 'bytes', text: str_(i18n.UIStrings.columnTransferSize),
          displayUnit: 'kb', granularity: 1},
      ];

      const summary = {wastedBytes: totalWastedBytes};
      const details = Audit.makeTableDetails(headings, results, summary);

      return {
        score,
        numericValue: totalWastedBytes,
        numericUnit: 'byte',
        displayValue: str_(UIStrings.displayValue, {itemCount: results.length}),
        extendedInfo: {
          value: {
            results,
            queryStringCount,
          },
        },
        details,
      };
    });
  }
}

module.exports = CacheHeaders;
module.exports.UIStrings = UIStrings;
