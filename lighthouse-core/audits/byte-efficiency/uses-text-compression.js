/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview Audit a page to ensure that resources loaded with
 * gzip/br/deflate compression.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const URL = require('../../lib/url-shim.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to enable text compression (like gzip) in order to enhance the performance of a page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Enable text compression',
  /** Description of a Lighthouse audit that tells the user *why* their text-based resources should be served with compression (like gzip). This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Text-based resources should be served with compression (gzip, deflate or' +
    ' brotli) to minimize total network bytes.' +
    ' [Learn more](https://web.dev/uses-text-compression).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['ResponseCompression', 'devtoolsLogs', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
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

      // we require at least 10% savings off the original size AND at least 1400 bytes
      // if the savings is smaller than either, we don't care
      if (1 - gzipSize / originalSize < IGNORE_THRESHOLD_IN_PERCENT ||
          gzipSavings < IGNORE_THRESHOLD_IN_BYTES ||
          record.transferSize < gzipSize
      ) {
        return;
      }

      // remove duplicates
      const url = URL.elideDataURI(record.url);
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

module.exports = ResponsesAreCompressed;
module.exports.UIStrings = UIStrings;
