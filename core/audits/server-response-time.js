/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NavigationInsights} from '../computed/navigation-insights.js';

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on how long it took from starting a request to when the server started responding. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Initial server response time was short',
  /** Title of a diagnostic audit that provides detail on how long it took from starting a request to when the server started responding. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Reduce initial server response time',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce the amount of time it takes their server to start responding to requests. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Keep the server response time for the main document short because all other requests depend on it. [Learn more about the Time to First Byte metric](https://developer.chrome.com/docs/lighthouse/performance/time-to-first-byte/).',
  /** Used to summarize the total Server Response Time duration for the primary HTML response. The `{timeInMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 210 ms) */
  displayValue: `Root document took {timeInMs, number, milliseconds}\xa0ms`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const TARGET_MS = 100;

class ServerResponseTime extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'server-response-time',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      guidanceLevel: 1,
      requiredArtifacts: ['Trace', 'SourceMaps', 'HostDPR'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings;
    const trace = artifacts.Trace;
    const {SourceMaps, HostDPR} = artifacts;
    const navInsights =
      await NavigationInsights.request({trace, settings, SourceMaps, HostDPR}, context);
    const responseTime = navInsights.model.DocumentLatency.data?.serverResponseTime;
    const url = navInsights.model.DocumentLatency.data?.documentRequest?.args.data.url;

    if (responseTime === undefined || !url) {
      throw new Error('no timing found for main resource');
    }

    const passed =
      Boolean(navInsights.model.DocumentLatency.data?.checklist.serverResponseIsFast.value);
    const displayValue = str_(UIStrings.displayValue, {timeInMs: responseTime});

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'responseTime', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnTimeSpent)},
    ];

    const overallSavingsMs = Math.max(responseTime - TARGET_MS, 0);
    const details = Audit.makeOpportunityDetails(
      headings,
      [{url, responseTime}],
      {overallSavingsMs}
    );

    return {
      numericValue: responseTime,
      numericUnit: 'millisecond',
      score: Number(passed),
      displayValue,
      details,
      metricSavings: {
        FCP: overallSavingsMs,
        LCP: overallSavingsMs,
      },
    };
  }
}

export default ServerResponseTime;
export {UIStrings};
