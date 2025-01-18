/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {NetworkRequest} from '../../lib/network-request.js';
import {NetworkRecords} from '../../computed/network-records.js';
import {Util} from '../../../shared/util.js';

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on large network resources required during page load. 'Payloads' is roughly equivalent to 'resources'. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Avoids enormous network payloads',
  /** Title of a diagnostic audit that provides detail on large network resources required during page load. 'Payloads' is roughly equivalent to 'resources'. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Avoid enormous network payloads',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce the size of the network resources required by the page. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description:
  'Large network payloads cost users real money and are highly correlated with ' +
  'long load times. [Learn how to reduce payload sizes](https://developer.chrome.com/docs/lighthouse/performance/total-byte-weight/).',
  /** Used to summarize the total byte size of the page and all its network requests. The `{totalBytes}` placeholder will be replaced with the total byte sizes, shown in kibibytes (e.g. 142 KiB) */
  displayValue: 'Total size was {totalBytes, number, bytes}\xa0KiB',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class TotalByteWeight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'total-byte-weight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 1,
      requiredArtifacts: ['devtoolsLogs'],
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
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const records = await NetworkRecords.request(devtoolsLog, context);

    let totalBytes = 0;
    /** @type {Array<{url: string, totalBytes: number}>} */
    let results = [];
    records.forEach(record => {
      // Exclude non-network URIs since their size is reflected in other resources.
      // Exclude records without transfer size information (or 0 bytes which won't matter anyway).
      if (NetworkRequest.isNonNetworkRequest(record) || !record.transferSize) return;

      const result = {
        url: record.url,
        totalBytes: record.transferSize,
      };

      totalBytes += result.totalBytes;
      results.push(result);
    });
    results = results.sort((itemA, itemB) => {
      return itemB.totalBytes - itemA.totalBytes ||
        itemA.url.localeCompare(itemB.url);
    }).slice(0, 10);

    const score = Audit.computeLogNormalScore(
      {p10: context.options.p10, median: context.options.median},
      totalBytes
    );

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results, {sortedBy: ['totalBytes']});

    return {
      score,
      scoreDisplayMode: score >= Util.PASS_THRESHOLD ? Audit.SCORING_MODES.INFORMATIVE : undefined,
      numericValue: totalBytes,
      numericUnit: 'byte',
      displayValue: str_(UIStrings.displayValue, {totalBytes}),
      details: tableDetails,
    };
  }
}

export default TotalByteWeight;
export {UIStrings};
