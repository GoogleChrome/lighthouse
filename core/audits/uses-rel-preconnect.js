/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import UrlUtils from '../lib/url-utils.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NetworkRecords} from '../computed/network-records.js';
import {MainResource} from '../computed/main-resource.js';
import {LoadSimulator} from '../computed/load-simulator.js';
import {ProcessedNavigation} from '../computed/processed-navigation.js';
import {PageDependencyGraph} from '../computed/page-dependency-graph.js';
import {LanternLargestContentfulPaint} from '../computed/metrics/lantern-largest-contentful-paint.js';
import {LanternFirstContentfulPaint} from '../computed/metrics/lantern-first-contentful-paint.js';

// Preconnect establishes a "clean" socket. Chrome's socket manager will keep an unused socket
// around for 10s. Meaning, the time delta between processing preconnect a request should be <10s,
// otherwise it's wasted. We add a 5s margin so we are sure to capture all key requests.
// @see https://github.com/GoogleChrome/lighthouse/issues/3106#issuecomment-333653747
const PRECONNECT_SOCKET_MAX_IDLE_IN_MS = 15_000;

const IGNORE_THRESHOLD_IN_MS = 50;

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to connect early to internet domains that will be used to load page resources. Origin is the correct term, however 'domain name' could be used if neccsesary. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Preconnect to required origins',
  /** Description of a Lighthouse audit that tells the user how to connect early to third-party domains that will be used to load page resources. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description:
    'Consider adding `preconnect` or `dns-prefetch` resource hints to establish early ' +
    'connections to important third-party origins. ' +
    '[Learn how to preconnect to required origins](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/).',
  /**
   * @description A warning message that is shown when the user tried to follow the advice of the audit, but it's not working as expected.
   * @example {https://example.com} securityOrigin
   * */
  unusedWarning: 'A `<link rel=preconnect>` was found for "{securityOrigin}" but was not used ' +
    'by the browser. Only use `preconnect` for important origins ' +
    'that the page will certainly request.',
  /**
   * @description A warning message that is shown when the user tried to follow the advice of the audit, but it's not working as expected. Forgetting to set the `crossorigin` HTML attribute, or setting it to an incorrect value, on the link is a common mistake when adding preconnect links.
   * @example {https://example.com} securityOrigin
   * */
  crossoriginWarning: 'A `<link rel=preconnect>` was found for "{securityOrigin}" but was not ' +
    'used by the browser. Check that you are using the `crossorigin` attribute properly.',
  /** A warning message that is shown when found more than 2 preconnected links */
  tooManyPreconnectLinksWarning: 'More than 2 `<link rel=preconnect>` connections were found. ' +
   'These should be used sparingly and only to the most important origins.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class UsesRelPreconnectAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-rel-preconnect',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'URL', 'LinkElements', 'SourceMaps'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   * Check if record has valid timing
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {boolean}
   */
  static hasValidTiming(record) {
    return !!record.timing && record.timing.connectEnd >= 0 && record.timing.connectStart >= 0;
  }

  /**
   * Check is the connection is already open
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {boolean}
   */
  static hasAlreadyConnectedToOrigin(record) {
    if (!record.timing) return false;

    // When these values are given as -1, that means the page has
    // a connection for this origin and paid these costs already.
    if (
      record.timing.dnsStart === -1 && record.timing.dnsEnd === -1 &&
      record.timing.connectStart === -1 && record.timing.connectEnd === -1
    ) {
      return true;
    }

    // Less understood: if the connection setup took no time at all, consider
    // it the same as the above. It is unclear if this is correct, or is even possible.
    if (
      record.timing.dnsEnd - record.timing.dnsStart === 0 &&
      record.timing.connectEnd - record.timing.connectStart === 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check is the connection has started before the socket idle time
   * @param {LH.Artifacts.NetworkRequest} record
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @return {boolean}
   */
  static socketStartTimeIsBelowThreshold(record, mainResource) {
    const timeSinceMainEnd = Math.max(0, record.networkRequestTime - mainResource.networkEndTime);
    return timeSinceMainEnd < PRECONNECT_SOCKET_MAX_IDLE_IN_MS;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.Trace;
    const devtoolsLog = artifacts.DevtoolsLog;
    const {URL, SourceMaps} = artifacts;
    const settings = context.settings;

    let maxWastedLcp = 0;
    let maxWastedFcp = 0;
    /** @type {Array<LH.IcuMessage>} */
    const warnings = [];

    const [networkRecords, mainResource, loadSimulator, processedNavigation, pageGraph] =
      await Promise.all([
        NetworkRecords.request(devtoolsLog, context),
        MainResource.request({devtoolsLog, URL}, context),
        LoadSimulator.request({devtoolsLog, settings}, context),
        ProcessedNavigation.request(trace, context),
        PageDependencyGraph.request(
          {settings, trace, devtoolsLog, URL, SourceMaps, fromTrace: false}, context),
      ]);

    const {rtt, additionalRttByOrigin} = loadSimulator.getOptions();
    const lcpGraph =
      LanternLargestContentfulPaint.getPessimisticGraph(pageGraph, processedNavigation);
    /** @type {Set<string>} */
    const lcpGraphURLs = new Set();
    lcpGraph.traverse(node => {
      if (node.type === 'network') lcpGraphURLs.add(node.request.url);
    });

    const fcpGraph =
      LanternFirstContentfulPaint.getPessimisticGraph(pageGraph, processedNavigation);
    const fcpGraphURLs = new Set();
    fcpGraph.traverse(node => {
      if (node.type === 'network') fcpGraphURLs.add(node.request.url);
    });

    /** @type {Map<string, LH.Artifacts.NetworkRequest[]>}  */
    const origins = new Map();
    networkRecords
      .forEach(record => {
        if (
          // Filter out all resources where timing info was invalid.
          !UsesRelPreconnectAudit.hasValidTiming(record) ||
          // Filter out all resources that are loaded by the document. Connections are already early.
          record.initiator.url === mainResource.url ||
          // Filter out urls that do not have an origin (data, file, etc).
          !record.parsedURL || !record.parsedURL.securityOrigin ||
          // Filter out all resources that have the same origin. We're already connected.
          mainResource.parsedURL.securityOrigin === record.parsedURL.securityOrigin ||
          // Filter out anything that wasn't part of LCP. Only recommend important origins.
          !lcpGraphURLs.has(record.url) ||
          // Filter out all resources where origins are already resolved.
          UsesRelPreconnectAudit.hasAlreadyConnectedToOrigin(record) ||
          // Make sure the requests are below the PRECONNECT_SOCKET_MAX_IDLE_IN_MS (15s) mark.
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
    const preconnectOrigins =
      new Set(preconnectLinks.map(link => UrlUtils.getOrigin(link.href || '')));

    /** @type {Array<{url: string, wastedMs: number}>}*/
    let results = [];
    origins.forEach(records => {
      // Sometimes requests are done simultaneous and the connection has not been made
      // chrome will try to connect for each network record, we get the first record
      const firstRecordOfOrigin = records.reduce((firstRecord, record) => {
        return (record.networkRequestTime < firstRecord.networkRequestTime) ? record : firstRecord;
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
        firstRecordOfOrigin.networkRequestTime -
        mainResource.networkEndTime +
        firstRecordOfOrigin.timing.dnsStart;

      const wastedMs = Math.min(connectionTime, timeBetweenMainResourceAndDnsStart);
      if (wastedMs < IGNORE_THRESHOLD_IN_MS) return;

      if (preconnectOrigins.has(securityOrigin)) {
        // Add a warning for any origin the user tried to preconnect to but failed
        warnings.push(str_(UIStrings.crossoriginWarning, {securityOrigin}));
        return;
      }

      maxWastedLcp = Math.max(wastedMs, maxWastedLcp);

      if (fcpGraphURLs.has(firstRecordOfOrigin.url)) {
        maxWastedFcp = Math.max(wastedMs, maxWastedLcp);
      }
      results.push({
        url: securityOrigin,
        wastedMs: wastedMs,
      });
    });

    results = results
      .sort((a, b) => b.wastedMs - a.wastedMs);

    // Add warnings for any preconnect origins that aren't being used.
    for (const origin of preconnectOrigins) {
      if (!origin) continue;
      if (networkRecords.some(record => origin === record.parsedURL.securityOrigin)) continue;
      warnings.push(str_(UIStrings.unusedWarning, {securityOrigin: origin}));
    }

    // Shortcut early with a pass when the user has already configured preconnect.
    // https://twitter.com/_tbansal/status/1197771385172480001
    if (preconnectLinks.length >= 2) {
      return {
        score: 1,
        warnings: preconnectLinks.length >= 3 ?
          [...warnings, str_(UIStrings.tooManyPreconnectLinksWarning)] : warnings,
        metricSavings: {LCP: maxWastedLcp, FCP: maxWastedFcp},
      };
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];

    const details = Audit.makeOpportunityDetails(headings, results,
      {overallSavingsMs: maxWastedLcp, sortedBy: ['wastedMs']});

    return {
      score: results.length ? 0 : 1,
      numericValue: maxWastedLcp,
      numericUnit: 'millisecond',
      displayValue: maxWastedLcp ?
        str_(i18n.UIStrings.displayValueMsSavings, {wastedMs: maxWastedLcp}) :
        '',
      warnings,
      details,
      metricSavings: {LCP: maxWastedLcp, FCP: maxWastedFcp},
    };
  }
}

export default UsesRelPreconnectAudit;
export {UIStrings};
