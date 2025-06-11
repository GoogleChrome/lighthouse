/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NetworkRecords} from '../computed/network-records.js';
import {NetworkAnalysis} from '../computed/network-analysis.js';

const UIStrings = {
  /** Descriptive title of a Lighthouse audit that tells the user the round trip times to each origin the page connected to. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Network Round Trip Times',
  /** Description of a Lighthouse audit that tells the user that a high network round trip time (RTT) can effect their website's performance because the server is physically far away from them thus making the RTT high. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Network round trip times (RTT) have a large impact on performance. ' +
    'If the RTT to an origin is high, it\'s an indication that servers closer to the user could ' +
    'improve performance. [Learn more about the Round Trip Time](https://hpbn.co/primer-on-latency-and-bandwidth/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NetworkRTT extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'network-rtt',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['DevtoolsLog'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.DevtoolsLog;
    const records = await NetworkRecords.request(devtoolsLog, context);
    if (!records.length) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    const analysis = await NetworkAnalysis.request(devtoolsLog, context);

    /** @type {number} */
    let maxRtt = 0;
    const baseRtt = analysis.rtt;
    /** @type {Array<{origin: string, rtt: number}>} */
    const results = [];
    for (const [origin, additionalRtt] of analysis.additionalRttByOrigin.entries()) {
      // Ignore entries that don't look like real origins, like the __SUMMARY__ entry.
      if (!origin.startsWith('http')) continue;

      const rtt = additionalRtt + baseRtt;
      results.push({origin, rtt});
      maxRtt = Number.isFinite(rtt) ? Math.max(rtt, maxRtt) : maxRtt;
    }

    results.sort((a, b) => b.rtt - a.rtt);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'origin', valueType: 'text', label: str_(i18n.UIStrings.columnURL)},
      {key: 'rtt', valueType: 'ms', granularity: 1, label: str_(i18n.UIStrings.columnTimeSpent)},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results, {sortedBy: ['rtt']});

    return {
      score: 1,
      numericValue: maxRtt,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.ms, {timeInMs: maxRtt}),
      details: tableDetails,
    };
  }
}

export default NetworkRTT;
export {UIStrings};
