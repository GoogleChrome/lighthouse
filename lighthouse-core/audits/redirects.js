/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit.js');
const i18n = require('../lib/i18n/i18n.js');
const TraceOfTab = require('../computed/trace-of-tab.js');
const NetworkRecords = require('../computed/network-records.js');
const MainResource = require('../computed/main-resource.js');
const LanternInteractive = require('../computed/metrics/lantern-interactive.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to eliminate the redirects taken through multiple URLs to load the page. This is shown in a list of audits that Lighthouse generates. */
  title: 'Avoid multiple page redirects',
  /** Description of a Lighthouse audit that tells users why they should reduce the number of server-side redirects on their page. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Redirects introduce additional delays before the page can be loaded. [Learn more](https://web.dev/redirects).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class Redirects extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'redirects',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['URL', 'devtoolsLogs', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings;
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    const traceOfTab = await TraceOfTab.request(trace, context);
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const mainResource = await MainResource.request({URL: artifacts.URL, devtoolsLog}, context);

    const metricComputationData = {trace, devtoolsLog, traceOfTab, networkRecords, settings};
    const metricResult = await LanternInteractive.request(metricComputationData, context);

    /** @type {Map<string, LH.Gatherer.Simulation.NodeTiming>} */
    const nodeTimingsByUrl = new Map();
    for (const [node, timing] of metricResult.pessimisticEstimate.nodeTimings.entries()) {
      if (node.type === 'network') {
        const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
        nodeTimingsByUrl.set(networkNode.record.url, timing);
      }
    }

    // redirects is only available when redirects happens
    const redirectRequests = Array.from(mainResource.redirects || []);

    // add main resource to redirectRequests so we can use it to calculate wastedMs
    redirectRequests.push(mainResource);

    let totalWastedMs = 0;
    const pageRedirects = [];

    // Kickoff the results table (with the initial request) if there are > 1 redirects
    if (redirectRequests.length > 1) {
      pageRedirects.push({
        url: `(Initial: ${redirectRequests[0].url})`,
        wastedMs: 0,
      });
    }

    for (let i = 1; i < redirectRequests.length; i++) {
      const initialRequest = redirectRequests[i - 1];
      const redirectedRequest = redirectRequests[i];

      const initialTiming = nodeTimingsByUrl.get(initialRequest.url);
      const redirectedTiming = nodeTimingsByUrl.get(redirectedRequest.url);
      if (!initialTiming || !redirectedTiming) {
        throw new Error('Could not find redirects in graph');
      }

      const wastedMs = redirectedTiming.startTime - initialTiming.startTime;
      totalWastedMs += wastedMs;

      pageRedirects.push({
        url: redirectedRequest.url,
        wastedMs,
      });
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnTimeSpent)},
    ];
    const details = Audit.makeOpportunityDetails(headings, pageRedirects, totalWastedMs);

    return {
      // We award a passing grade if you only have 1 redirect
      score: redirectRequests.length <= 2 ? 1 : UnusedBytes.scoreForWastedMs(totalWastedMs),
      numericValue: totalWastedMs,
      numericUnit: 'millisecond',
      displayValue: totalWastedMs ?
        str_(i18n.UIStrings.displayValueMsSavings, {wastedMs: totalWastedMs}) :
        '',
      extendedInfo: {
        value: {
          wastedMs: totalWastedMs,
        },
      },
      details,
    };
  }
}

module.exports = Redirects;
module.exports.UIStrings = UIStrings;
