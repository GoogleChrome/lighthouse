/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/*
 * @fileoverview Audit a page to ensure that resources loaded with
 * gzip/br/deflate compression.
 */


import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import UrlUtils from '../../lib/url-utils.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to enable text compression (like gzip) in order to enhance the performance of a page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Enable text compression',
  /** Description of a Lighthouse audit that tells the user *why* their text-based resources should be served with compression (like gzip). This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Text-based resources should be served with compression (gzip, deflate or' +
    ' brotli) to minimize total network bytes.' +
    ' [Learn more about text compression](https://developer.chrome.com/docs/lighthouse/performance/uses-text-compression/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 1400;
const IGNORE_THRESHOLD_IN_PERCENT = 0.1;

class ResponsesAreCompressed extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-text-compression',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 3,
      requiredArtifacts: ['ResponseCompression', 'GatherContext', 'devtoolsLogs', 'traces', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {import('./byte-efficiency-audit.js').ByteEfficiencyProduct}
   */
  static audit_(artifacts) {
    const uncompressedResponses = artifacts.ResponseCompression;

    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    uncompressedResponses.forEach(record => {
      // Ignore invalid GZIP size values (undefined, NaN, 0, -n, etc)
      if (!record.gzipSize || record.gzipSize < 0) return;

      const originalSize = record.resourceSize;
      const gzipSize = record.gzipSize;
      const gzipSavings = originalSize - gzipSize;

      // Not every resource is smaller when compressed.
      if (record.transferSize < gzipSize) {
        return;
      }

      // If savings is small, let's be generous and not surface the minor savings.
      if (gzipSavings < IGNORE_THRESHOLD_IN_BYTES) {
        return;
      }

      // Require at least 20kb of savings ... or some percentage of total resource size.
      if (gzipSavings < 20_000 && 1 - gzipSize / originalSize < IGNORE_THRESHOLD_IN_PERCENT) {
        return;
      }

      // remove duplicates
      const url = UrlUtils.elideDataURI(record.url);
      const isDuplicate = items.find(item => item.url === url &&
        item.totalBytes === record.resourceSize);
      if (isDuplicate) {
        return;
      }

      items.push({
        url,
        totalBytes: originalSize,
        wastedBytes: gzipSavings,
      });
    });

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    return {
      items,
      headings,
    };
  }
}

export default ResponsesAreCompressed;
export {UIStrings};
