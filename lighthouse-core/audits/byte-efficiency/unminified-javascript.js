/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const i18n = require('../../lib/i18n/i18n.js');
const computeTokenLength = require('../../lib/minification-estimator.js').computeJSTokenLength;

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to minify the page’s JS code to reduce file size. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Minify JavaScript',
  /** Description of a Lighthouse audit that tells the user *why* they should minify the page’s JS code to reduce file size. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Minifying JavaScript files can reduce payload sizes and script parse time. ' +
    '[Learn more](https://web.dev/unminified-javascript).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const IGNORE_THRESHOLD_IN_PERCENT = 10;
const IGNORE_THRESHOLD_IN_BYTES = 2048;

/**
 * @fileOverview Estimates minification savings by determining the ratio of parseable JS tokens to the
 * length of the entire string. Though simple, this method is quite accurate at identifying whether
 * a script was already minified and offers a relatively conservative minification estimate (our two
 * primary goals).
 *
 * This audit only examines scripts that were independent network requests and not inlined or eval'd.
 *
 * See https://github.com/GoogleChrome/lighthouse/pull/3950#issue-277887798 for stats on accuracy.
 */
class UnminifiedJavaScript extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'unminified-javascript',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['ScriptElements', 'devtoolsLogs', 'traces'],
    };
  }

  /**
   * @param {string} scriptContent
   * @param {string} displayUrl
   * @param {LH.Artifacts.NetworkRequest|undefined} networkRecord
   * @return {{url: string, totalBytes: number, wastedBytes: number, wastedPercent: number}}
   */
  static computeWaste(scriptContent, displayUrl, networkRecord) {
    const contentLength = scriptContent.length;
    const totalTokenLength = computeTokenLength(scriptContent);

    const totalBytes = ByteEfficiencyAudit.estimateTransferSize(networkRecord, contentLength,
      'Script');
    const wastedRatio = 1 - totalTokenLength / contentLength;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    return {
      url: displayUrl,
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
    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    const warnings = [];
    for (const {requestId, src, content} of artifacts.ScriptElements) {
      if (!content) continue;

      const networkRecord = networkRecords.find(record => record.requestId === requestId);
      const displayUrl = !src || !networkRecord ?
        `inline: ${content.substr(0, 40)}...` :
        networkRecord.url;
      try {
        const result = UnminifiedJavaScript.computeWaste(content, displayUrl, networkRecord);
        // If the ratio is minimal, the file is likely already minified, so ignore it.
        // If the total number of bytes to be saved is quite small, it's also safe to ignore.
        if (result.wastedPercent < IGNORE_THRESHOLD_IN_PERCENT ||
          result.wastedBytes < IGNORE_THRESHOLD_IN_BYTES ||
          !Number.isFinite(result.wastedBytes)) continue;
        items.push(result);
      } catch (err) {
        const url = networkRecord ? networkRecord.url : '?';
        warnings.push(`Unable to process script ${url}: ${err.message}`);
      }
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    return {
      items,
      warnings,
      headings,
    };
  }
}

module.exports = UnminifiedJavaScript;
module.exports.UIStrings = UIStrings;
