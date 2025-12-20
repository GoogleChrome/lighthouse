/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const i18n = require('../../lib/i18n/i18n.js');
const NetworkRecords = require('../../computed/network-records.js');

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on large network resources required during page load. 'Payloads' is roughly equivalent to 'resources'. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Avoids enormous network payloads',
  /** Title of a diagnostic audit that provides detail on large network resources required during page load. 'Payloads' is roughly equivalent to 'resources'. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Avoid enormous network payloads',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce the size of the network resources required by the page. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description:
  'Large network payloads cost users real money and are highly correlated with ' +
  'long load times. [Learn ' +
  'more](https://web.dev/total-byte-weight).',
  /** Used to summarize the total byte size of the page and all its network requests. The `{totalBytes}` placeholder will be replaced with the total byte sizes, shown in kilobytes (e.g. 142 KB) */
  displayValue: 'Total size was {totalBytes, number, bytes}\xa0KB',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class TotalByteWeight extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'total-byte-weight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs', 'traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/h7kfv68jre
      // ~25th and ~10th percentiles, with resulting p10 computed.
      // http://httparchive.org/interesting.php?a=All&l=Feb%201%202017&s=All#bytesTotal
      p10: 2667 * 1024,
      median: 4000 * 1024,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[ByteEfficiencyAudit.DEFAULT_PASS];
    const records = await NetworkRecords.request(devtoolsLog, context);

    let totalBytes = 0;
    /** @type {Array<{url: string, totalBytes: number}>} */
    let results = [];
    records.forEach(record => {
      // exclude data URIs since their size is reflected in other resources
      // exclude unfinished requests since they won't have transfer size information
      if (record.parsedURL.scheme === 'data' || !record.finished) return;

      const result = {
        url: record.url,
        totalBytes: record.transferSize,
      };

      totalBytes += result.totalBytes;
      results.push(result);
    });
    const totalCompletedRequests = results.length;
    results = results.sort((itemA, itemB) => {
      return itemB.totalBytes - itemA.totalBytes ||
        itemA.url.localeCompare(itemB.url);
    }).slice(0, 10);

    const score = ByteEfficiencyAudit.computeLogNormalScore(
      {p10: context.options.p10, median: context.options.median},
      totalBytes
    );

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', itemType: 'bytes', text: str_(i18n.UIStrings.columnTransferSize)},
    ];

    const tableDetails = ByteEfficiencyAudit.makeTableDetails(headings, results);

    return {
      score,
      numericValue: totalBytes,
      numericUnit: 'byte',
      displayValue: str_(UIStrings.displayValue, {totalBytes}),
      extendedInfo: {
        value: {
          results,
          totalCompletedRequests,
        },
      },
      details: tableDetails,
    };
  }
}

module.exports = TotalByteWeight;
module.exports.UIStrings = UIStrings;
