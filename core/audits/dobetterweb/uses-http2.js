/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to ensure that resource loaded over its own
 * origin are over the http/2 protocol.
 */

/** @typedef {import('../../lib/dependency-graph/simulator/simulator').Simulator} Simulator */
/** @typedef {import('../../lib/dependency-graph/base-node.js').Node} Node */

import {Audit} from '../audit.js';
import {EntityClassification} from '../../computed/entity-classification.js';
import UrlUtils from '../../lib/url-utils.js';
import {ByteEfficiencyAudit} from '../byte-efficiency/byte-efficiency-audit.js';
import {LanternInteractive} from '../../computed/metrics/lantern-interactive.js';
import {NetworkRequest} from '../../lib/network-request.js';
import {NetworkRecords} from '../../computed/network-records.js';
import {LoadSimulator} from '../../computed/load-simulator.js';
import {PageDependencyGraph} from '../../computed/page-dependency-graph.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to enable HTTP/2. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Use HTTP/2',
  /** Description of a Lighthouse audit that tells the user why they should use HTTP/2. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'HTTP/2 offers many benefits over HTTP/1.1, including binary headers and ' +
      'multiplexing. [Learn more about HTTP/2](https://developer.chrome.com/docs/lighthouse/best-practices/uses-http2/).',
  /** [ICU Syntax] Label identifying the number of network requests that were not served with HTTP/2. */
  displayValue: `{itemCount, plural,
    =1 {1 request not served via HTTP/2}
    other {# requests not served via HTTP/2}
    }`,
  /**  Label for a column in a data table; entries in the column will be the HTTP Protocol used to make a network request. */
  columnProtocol: 'Protocol',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {Set<LH.Artifacts.NetworkRequest['resourceType']>} */
const STATIC_RESOURCE_TYPES = new Set([
  NetworkRequest.TYPES.Document,
  NetworkRequest.TYPES.Font,
  NetworkRequest.TYPES.Image,
  NetworkRequest.TYPES.Stylesheet,
  NetworkRequest.TYPES.Script,
  NetworkRequest.TYPES.Media,
]);

class UsesHTTP2Audit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-http2',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['timespan', 'navigation'],
      requiredArtifacts: ['URL', 'devtoolsLogs', 'traces', 'GatherContext'],
    };
  }

  /**
   * Computes the estimated effect all results being converted to use http/2, the max of:
   *
   * - end time of the last long task in the provided graph
   * - end time of the last node in the graph
   *
   * @param {Array<{url: string}>} results
   * @param {Node} graph
   * @param {Simulator} simulator
   * @return {number}
   */
  static computeWasteWithTTIGraph(results, graph, simulator) {
    const beforeLabel = `uses-http2-before`;
    const afterLabel = `uses-http2-after`;

    const urlsToChange = new Set(results.map(result => result.url));
    const simulationBefore = simulator.simulate(graph, {label: beforeLabel});

    // Update all the protocols to reflect implementing our recommendations
    /** @type {Map<string, string>} */
    const originalProtocols = new Map();
    graph.traverse(node => {
      if (node.type !== 'network') return;
      if (!urlsToChange.has(node.record.url)) return;

      originalProtocols.set(node.record.requestId, node.record.protocol);
      node.record.protocol = 'h2';
    });

    const simulationAfter = simulator.simulate(graph, {label: afterLabel});

    // Restore the original protocol after we've done our simulation
    graph.traverse(node => {
      if (node.type !== 'network') return;
      const originalProtocol = originalProtocols.get(node.record.requestId);
      if (originalProtocol === undefined) return;
      node.record.protocol = originalProtocol;
    });

    const savingsOnOverallLoad = simulationBefore.timeInMs - simulationAfter.timeInMs;
    const savingsOnTTI = LanternInteractive.getLastLongTaskEndTime(simulationBefore.nodeTimings) -
      LanternInteractive.getLastLongTaskEndTime(simulationAfter.nodeTimings);
    const savings = Math.max(savingsOnTTI, savingsOnOverallLoad);

    // Round waste to nearest 10ms
    return Math.round(Math.max(savings, 0) / 10) * 10;
  }

  /**
   * Determines whether a network request is a "static resource" that would benefit from H2 multiplexing.
   * XHRs, tracking pixels, etc generally don't benefit as much because they aren't requested en-masse
   * for the same origin at the exact same time.
   *
   * @param {LH.Artifacts.NetworkRequest} networkRequest
   * @param {LH.Artifacts.EntityClassification} classifiedEntities
   * @return {boolean}
   */
  static isStaticAsset(networkRequest, classifiedEntities) {
    if (!STATIC_RESOURCE_TYPES.has(networkRequest.resourceType)) return false;

    // Resources from third-parties that are less than 100 bytes are usually tracking pixels, not actual resources.
    // They can masquerade as static types though (gifs, documents, etc)
    if (networkRequest.resourceSize < 100) {
      // This logic needs to be revisited.
      // See https://github.com/GoogleChrome/lighthouse/issues/14661
      const entity = classifiedEntities.entityByUrl.get(networkRequest.url);
      if (entity && !entity.isUnrecognized) return false;
    }

    return true;
  }

  /**
   * Determine the set of resources that aren't HTTP/2 but should be.
   * We're a little conservative about what we surface for a few reasons:
   *
   *    - The simulator approximation of HTTP/2 is a little more generous than reality.
   *    - There's a bit of debate surrounding HTTP/2 due to its worse performance in environments with high packet loss.**
   *    - It's something that you'd have absolutely zero control over with a third-party (can't defer to fix it for example).
   *
   * Therefore, we only surface requests that were...
   *
   *    - Served over HTTP/1.1 or earlier
   *    - Served over an origin that serves at least 6 static asset requests
   *      (if there aren't more requests than browser's max/host, multiplexing isn't as big a deal)
   *    - Not served on localhost (h2 is a pain to deal with locally & and CI)
   *
   * ** = https://news.ycombinator.com/item?id=19086639
   *      https://www.twilio.com/blog/2017/10/http2-issues.html
   *      https://www.cachefly.com/http-2-is-not-a-magic-bullet/
   *
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Artifacts.EntityClassification} classifiedEntities
   * @return {Array<{url: string, protocol: string}>}
   */
  static determineNonHttp2Resources(networkRecords, classifiedEntities) {
    /** @type {Array<{url: string, protocol: string}>} */
    const nonHttp2Resources = [];

    /** @type {Set<string>} */
    const seenURLs = new Set();
    /** @type {Map<string, Array<LH.Artifacts.NetworkRequest>>} */
    const groupedByOrigin = new Map();
    for (const record of networkRecords) {
      if (!UsesHTTP2Audit.isStaticAsset(record, classifiedEntities)) continue;
      if (UrlUtils.isLikeLocalhost(record.parsedURL.host)) continue;
      const existing = groupedByOrigin.get(record.parsedURL.securityOrigin) || [];
      existing.push(record);
      groupedByOrigin.set(record.parsedURL.securityOrigin, existing);
    }

    for (const record of networkRecords) {
      // Skip duplicates.
      if (seenURLs.has(record.url)) continue;
      // Check if record is not served through the service worker, servicer worker uses http/1.1 as a protocol.
      // These can generate false positives (bug: https://github.com/GoogleChrome/lighthouse/issues/7158).
      if (record.fetchedViaServiceWorker) continue;
      // Test the protocol to see if it was http/1.1.
      const isOldHttp = /HTTP\/[01][.\d]?/i.test(record.protocol);
      if (!isOldHttp) continue;
      // Check if the origin has enough requests to bother flagging.
      const group = groupedByOrigin.get(record.parsedURL.securityOrigin) || [];
      if (group.length < 6) continue;

      seenURLs.add(record.url);
      nonHttp2Resources.push({protocol: record.protocol, url: record.url});
    }

    return nonHttp2Resources;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const classifiedEntities = await EntityClassification.request({URL, devtoolsLog}, context);
    const resources = UsesHTTP2Audit.determineNonHttp2Resources(networkRecords, classifiedEntities);

    let displayValue;
    if (resources.length > 0) {
      displayValue = str_(UIStrings.displayValue, {itemCount: resources.length});
    }

    // TODO: Compute actual savings for timespan mode.
    if (artifacts.GatherContext.gatherMode === 'timespan') {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
        {key: 'protocol', valueType: 'text', label: str_(UIStrings.columnProtocol)},
      ];

      const details = Audit.makeTableDetails(headings, resources);

      return {
        displayValue,
        score: resources.length ? 0 : 1,
        details,
      };
    }

    const settings = context?.settings || {};
    const simulatorOptions = {
      devtoolsLog,
      settings,
    };
    const graph = await PageDependencyGraph.request({trace, devtoolsLog, URL}, context);
    const simulator = await LoadSimulator.request(simulatorOptions, context);
    const wastedMs = UsesHTTP2Audit.computeWasteWithTTIGraph(resources, graph, simulator);

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'protocol', valueType: 'text', label: str_(UIStrings.columnProtocol)},
    ];

    const details = Audit.makeOpportunityDetails(headings, resources,
      {overallSavingsMs: wastedMs});

    return {
      displayValue,
      numericValue: wastedMs,
      numericUnit: 'millisecond',
      score: ByteEfficiencyAudit.scoreForWastedMs(wastedMs),
      details,
    };
  }
}

export default UsesHTTP2Audit;
export {UIStrings};
