/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {ProcessedTrace} from '../computed/processed-trace.js';
import {NetworkRecords} from '../computed/network-records.js';
import {LanternInteractive} from '../computed/metrics/lantern-interactive.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to eliminate the redirects taken through multiple URLs to load the page. This is shown in a list of audits that Lighthouse generates. */
  title: 'Avoid multiple page redirects',
  /** Description of a Lighthouse audit that tells users why they should reduce the number of server-side redirects on their page. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Redirects introduce additional delays before the page can be loaded. [Learn how to avoid page redirects](https://developer.chrome.com/docs/lighthouse/performance/redirects/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class Redirects extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'redirects',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      supportedModes: ['navigation'],
      guidanceLevel: 2,
      requiredArtifacts: ['URL', 'GatherContext', 'DevtoolsLog', 'Trace', 'SourceMaps'],
    };
  }

  /**
   * This method generates the document request chain including client-side and server-side redirects.
   *
   * Example:
   *    GET /requestedUrl => 302 /firstRedirect
   *    GET /firstRedirect => 200 /firstRedirect, window.location = '/secondRedirect'
   *    GET /secondRedirect => 302 /thirdRedirect
   *    GET /thirdRedirect => 302 /mainDocumentUrl
   *    GET /mainDocumentUrl => 200 /mainDocumentUrl
   *
   * Returns network records [/requestedUrl, /firstRedirect, /secondRedirect, /thirdRedirect, /mainDocumentUrl]
   *
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Artifacts.ProcessedTrace} processedTrace
   * @return {Array<LH.Artifacts.NetworkRequest>}
   */
  static getDocumentRequestChain(networkRecords, processedTrace) {
    /** @type {Array<LH.Artifacts.NetworkRequest>} */
    const documentRequests = [];

    // Find all the document requests by examining navigation events and their redirects
    for (const event of processedTrace.processEvents) {
      if (event.name !== 'navigationStart') continue;

      const data = event.args.data || {};
      if (!data.documentLoaderURL || !data.isLoadingMainFrame) continue;

      let networkRecord = networkRecords.find(record => record.requestId === data.navigationId);
      while (networkRecord) {
        documentRequests.push(networkRecord);
        // HTTP redirects won't have separate navStarts, so find through the redirect chain.
        networkRecord = networkRecord.redirectDestination;
      }
    }

    if (!documentRequests.length) {
      throw new Error('No navigation requests found');
    }

    return documentRequests;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings;
    const trace = artifacts.Trace;
    const devtoolsLog = artifacts.DevtoolsLog;
    const gatherContext = artifacts.GatherContext;
    const {URL, SourceMaps} = artifacts;

    const processedTrace = await ProcessedTrace.request(trace, context);
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const documentRequests = Redirects.getDocumentRequestChain(networkRecords, processedTrace);

    const metricComputationData =
      {trace, devtoolsLog, gatherContext, settings, URL, SourceMaps, simulator: null};
    const metricResult = await LanternInteractive.request(metricComputationData, context);

    /** @type {Map<string, LH.Gatherer.Simulation.NodeTiming>} */
    const nodeTimingsById = new Map();
    for (const [node, timing] of metricResult.pessimisticEstimate.nodeTimings.entries()) {
      if (node.type === 'network') {
        nodeTimingsById.set(node.request.requestId, timing);
      }
    }

    let totalWastedMs = 0;
    const tableRows = [];

    // Iterate through all the document requests and report how much time was wasted until the
    // next document request was issued. The final document request will have a `wastedMs` of 0.
    for (let i = 0; i < documentRequests.length; i++) {
      // If we didn't have enough documents for at least 1 redirect, just skip this loop.
      if (documentRequests.length < 2) break;

      const initialRequest = documentRequests[i];
      const redirectedRequest = documentRequests[i + 1] || initialRequest;

      const initialTiming = nodeTimingsById.get(initialRequest.requestId);
      const redirectedTiming = nodeTimingsById.get(redirectedRequest.requestId);
      if (!initialTiming || !redirectedTiming) {
        throw new Error('Could not find redirects in graph');
      }

      const lanternTimingDeltaMs = redirectedTiming.startTime - initialTiming.startTime;
      const observedTimingDeltaMs = redirectedRequest.networkRequestTime -
          initialRequest.networkRequestTime;
      const wastedMs = settings.throttlingMethod === 'simulate' ?
        lanternTimingDeltaMs : observedTimingDeltaMs;
      totalWastedMs += wastedMs;

      tableRows.push({
        url: initialRequest.url,
        wastedMs,
      });
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnTimeSpent)},
    ];
    const details = Audit.makeOpportunityDetails(headings, tableRows,
      {overallSavingsMs: totalWastedMs});

    return {
      score: tableRows.length ? 0 : 1,
      numericValue: totalWastedMs,
      numericUnit: 'millisecond',
      displayValue: totalWastedMs ?
        str_(i18n.UIStrings.displayValueMsSavings, {wastedMs: totalWastedMs}) :
        '',
      details,
      metricSavings: {
        LCP: totalWastedMs,
        FCP: totalWastedMs,
      },
    };
  }
}

export default Redirects;
export {UIStrings};
