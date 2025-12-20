/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');
const NetworkAnalysisComputed = require('../computed/network-analysis.js');

const UIStrings = {
  /** Descriptive title of a Lighthouse audit that tells the user the round trip times to each origin the page connected to. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Network Round Trip Times',
  /** Description of a Lighthouse audit that tells the user that a high network round trip time (RTT) can effect their website's performance because the server is physically far away from them thus making the RTT high. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Network round trip times (RTT) have a large impact on performance. ' +
    'If the RTT to an origin is high, it\'s an indication that servers closer to the user could ' +
    'improve performance. [Learn more](https://hpbn.co/primer-on-latency-and-bandwidth/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const analysis = await NetworkAnalysisComputed.request(devtoolsLog, context);

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
      {key: 'origin', itemType: 'text', text: str_(i18n.UIStrings.columnURL)},
      {key: 'rtt', itemType: 'ms', granularity: 1, text: str_(i18n.UIStrings.columnTimeSpent)},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);

    return {
      score: 1,
      numericValue: maxRtt,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.ms, {timeInMs: maxRtt}),
      details: tableDetails,
    };
  }
}

module.exports = NetworkRTT;
module.exports.UIStrings = UIStrings;
