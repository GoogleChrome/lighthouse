/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const UnusedCSS = require('../../computed/unused-css.js');
const i18n = require('../../lib/i18n/i18n.js');
const computeTokenLength = require('../../lib/minification-estimator.js').computeCSSTokenLength;

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to minify (remove whitespace) the page's CSS code. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Minify CSS',
  /** Description of a Lighthouse audit that tells the user *why* they should minify (remove whitespace) the page's CSS code. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Minifying CSS files can reduce network payload sizes. ' +
    '[Learn more](https://web.dev/unminified-css).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const IGNORE_THRESHOLD_IN_PERCENT = 5;
const IGNORE_THRESHOLD_IN_BYTES = 2048;

/**
 * @fileOverview
 */
class UnminifiedCSS extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'unminified-css',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['CSSUsage', 'devtoolsLogs', 'traces', 'URL'],
    };
  }

  /**
   * Computes the total length of the meaningful tokens (CSS excluding comments and whitespace).
   *
   * @param {string} content
   * @return {number}
   */
  static computeTokenLength(content) {
    return computeTokenLength(content);
  }

  /**
   * @param {LH.Artifacts.CSSStyleSheetInfo} stylesheet
   * @param {LH.Artifacts.NetworkRequest=} networkRecord
   * @param {string} pageUrl
   * @return {{url: string, totalBytes: number, wastedBytes: number, wastedPercent: number}}
   */
  static computeWaste(stylesheet, networkRecord, pageUrl) {
    const content = stylesheet.content;
    const totalTokenLength = UnminifiedCSS.computeTokenLength(content);

    let url = stylesheet.header.sourceURL;
    if (!url || url === pageUrl) {
      const contentPreview = UnusedCSS.determineContentPreview(stylesheet.content);
      url = contentPreview;
    }

    const totalBytes = ByteEfficiencyAudit.estimateTransferSize(networkRecord, content.length,
      'Stylesheet');
    const wastedRatio = 1 - totalTokenLength / content.length;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    return {
      url,
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
   */
  static audit_(artifacts, networkRecords) {
    const pageUrl = artifacts.URL.finalUrl;
    const items = [];
    for (const stylesheet of artifacts.CSSUsage.stylesheets) {
      const networkRecord = networkRecords
        .find(record => record.url === stylesheet.header.sourceURL);
      if (!stylesheet.content) continue;

      const result = UnminifiedCSS.computeWaste(stylesheet, networkRecord, pageUrl);

      // If the ratio is minimal, the file is likely already minified, so ignore it.
      // If the total number of bytes to be saved is quite small, it's also safe to ignore.
      if (result.wastedPercent < IGNORE_THRESHOLD_IN_PERCENT ||
          result.wastedBytes < IGNORE_THRESHOLD_IN_BYTES ||
          !Number.isFinite(result.wastedBytes)) continue;
      items.push(result);
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    return {items, headings};
  }
}

module.exports = UnminifiedCSS;
module.exports.UIStrings = UIStrings;
