/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audit.js');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit.js');
const URL = require('../lib/url-shim.js');
const i18n = require('../lib/i18n/i18n.js');
const NetworkRecords = require('../computed/network-records.js');
const MainResource = require('../computed/main-resource.js');
const LoadSimulator = require('../computed/load-simulator.js');

// Preconnect establishes a "clean" socket. Chrome's socket manager will keep an unused socket
// around for 10s. Meaning, the time delta between processing preconnect a request should be <10s,
// otherwise it's wasted. We add a 5s margin so we are sure to capture all key requests.
// @see https://github.com/GoogleChrome/lighthouse/issues/3106#issuecomment-333653747
const PRECONNECT_SOCKET_MAX_IDLE = 15;

const IGNORE_THRESHOLD_IN_MS = 50;

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to connect early to internet domains that will be used to load page resources. Origin is the correct term, however 'domain name' could be used if neccsesary. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Preconnect to required origins',
  /** Description of a Lighthouse audit that tells the user how to connect early to third-party domains that will be used to load page resources. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description:
    'Consider adding `preconnect` or `dns-prefetch` resource hints to establish early ' +
    `connections to important third-party origins. [Learn more](https://web.dev/uses-rel-preconnect).`,
  /**
   * @description A warning message that is shown when the user tried to follow the advice of the audit, but it's not working as expected. Forgetting to set the `crossorigin` HTML attribute, or setting it to an incorrect value, on the link is a common mistake when adding preconnect links.
   * @example {https://example.com} securityOrigin
   * */
  crossoriginWarning: 'A preconnect <link> was found for "{securityOrigin}" but was not used ' +
    'by the browser. Check that you are using the `crossorigin` attribute properly.',
  /** A warning message that is shown when found more than 2 preconnected links */
  tooManyPreconnectLinksWarning: 'More than 2 preconnect links were found. ' +
   'Preconnect links should be used sparingly and only to the most important origins.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class UsesRelPreconnectAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-rel-preconnect',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs', 'URL', 'LinkElements'],
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
    };
  }

  /**
   * Check if record has valid timing
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {boolean}
   */
  static hasValidTiming(record) {
    return !!record.timing && record.timing.connectEnd > 0 && record.timing.connectStart > 0;
  }

  /**
   * Check is the connection is already open
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {boolean}
   */
  static hasAlreadyConnectedToOrigin(record) {
    return (
      !!record.timing &&
      record.timing.dnsEnd - record.timing.dnsStart === 0 &&
      record.timing.connectEnd - record.timing.connectStart === 0
    );
  }

  /**
   * Check is the connection has started before the socket idle time
   * @param {LH.Artifacts.NetworkRequest} record
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @return {boolean}
   */
  static socketStartTimeIsBelowThreshold(record, mainResource) {
    return Math.max(0, record.startTime - mainResource.endTime) < PRECONNECT_SOCKET_MAX_IDLE;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[UsesRelPreconnectAudit.DEFAULT_PASS];
    const settings = context.settings;
    let maxWasted = 0;
    /** @type {string[]} */
    const warnings = [];

    const [networkRecords, mainResource, loadSimulator] = await Promise.all([
      NetworkRecords.request(devtoolsLog, context),
      MainResource.request({devtoolsLog, URL: artifacts.URL}, context),
      LoadSimulator.request({devtoolsLog, settings}, context),
    ]);

    const {rtt, additionalRttByOrigin} = loadSimulator.getOptions();

    /** @type {Map<string, LH.Artifacts.NetworkRequest[]>}  */
    const origins = new Map();
    networkRecords
      .forEach(record => {
        if (
          // filter out all resources where timing info was invalid
          !UsesRelPreconnectAudit.hasValidTiming(record) ||
          // filter out all resources that are loaded by the document
          record.initiator.url === mainResource.url ||
          // filter out urls that do not have an origin (data, ...)
          !record.parsedURL || !record.parsedURL.securityOrigin ||
          // filter out all resources that have the same origin
          mainResource.parsedURL.securityOrigin === record.parsedURL.securityOrigin ||
          // filter out all resources where origins are already resolved
          UsesRelPreconnectAudit.hasAlreadyConnectedToOrigin(record) ||
          // make sure the requests are below the PRECONNECT_SOCKET_MAX_IDLE (15s) mark
          !UsesRelPreconnectAudit.socketStartTimeIsBelowThreshold(record, mainResource)
        ) {
          return;
        }

        const securityOrigin = record.parsedURL.securityOrigin;
        const records = origins.get(securityOrigin) || [];
        records.push(record);
        origins.set(securityOrigin, records);
      });

    const preconnectLinks = artifacts.LinkElements.filter(el => el.rel === 'preconnect');
    const preconnectOrigins = new Set(preconnectLinks.map(link => URL.getOrigin(link.href || '')));

    /** @type {Array<{url: string, wastedMs: number}>}*/
    let results = [];
    origins.forEach(records => {
      // Sometimes requests are done simultaneous and the connection has not been made
      // chrome will try to connect for each network record, we get the first record
      const firstRecordOfOrigin = records.reduce((firstRecord, record) => {
        return (record.startTime < firstRecord.startTime) ? record : firstRecord;
      });

      // Skip the origin if we don't have timing information
      if (!firstRecordOfOrigin.timing) return;

      const securityOrigin = firstRecordOfOrigin.parsedURL.securityOrigin;

      // Approximate the connection time with the duration of TCP (+potentially SSL) handshake
      // DNS time can be large but can also be 0 if a commonly used origin that's cached, so make
      // no assumption about DNS.
      const additionalRtt = additionalRttByOrigin.get(securityOrigin) || 0;
      let connectionTime = rtt + additionalRtt;
      // TCP Handshake will be at least 2 RTTs for TLS connections
      if (firstRecordOfOrigin.parsedURL.scheme === 'https') connectionTime = connectionTime * 2;

      const timeBetweenMainResourceAndDnsStart =
        firstRecordOfOrigin.startTime * 1000 -
        mainResource.endTime * 1000 +
        firstRecordOfOrigin.timing.dnsStart;

      const wastedMs = Math.min(connectionTime, timeBetweenMainResourceAndDnsStart);
      if (wastedMs < IGNORE_THRESHOLD_IN_MS) return;

      if (preconnectOrigins.has(securityOrigin)) {
        // Add a warning for any origin the user tried to preconnect to but failed
        warnings.push(str_(UIStrings.crossoriginWarning, {securityOrigin}));
        return;
      }

      maxWasted = Math.max(wastedMs, maxWasted);
      results.push({
        url: securityOrigin,
        wastedMs: wastedMs,
      });
    });

    results = results
      .sort((a, b) => b.wastedMs - a.wastedMs);

    // Shortcut early with a pass when the user has already configured preconnect.
    // https://twitter.com/_tbansal/status/1197771385172480001
    if (preconnectLinks.length >= 2) {
      return {
        score: 1,
        warnings: preconnectLinks.length >= 3 ?
          [...warnings, str_(UIStrings.tooManyPreconnectLinksWarning)] : warnings,
      };
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];

    const details = Audit.makeOpportunityDetails(headings, results, maxWasted);

    return {
      score: UnusedBytes.scoreForWastedMs(maxWasted),
      numericValue: maxWasted,
      numericUnit: 'millisecond',
      displayValue: maxWasted ?
        str_(i18n.UIStrings.displayValueMsSavings, {wastedMs: maxWasted}) :
        '',
      extendedInfo: {
        value: results,
      },
      warnings,
      details,
    };
  }
}

module.exports = UsesRelPreconnectAudit;
module.exports.UIStrings = UIStrings;
