/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const UnusedCSS = require('../../computed/unused-css.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to remove content from their CSS that isn’t needed immediately and instead load that content at a later time. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Remove unused CSS',
  /** Description of a Lighthouse audit that tells the user *why* they should defer loading any content in CSS that isn’t needed at page load. This is displayed after a user expands the section to see more. No word length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Remove dead rules from stylesheets and defer the loading of CSS not used for ' +
    'above-the-fold content to reduce unnecessary bytes consumed by network activity. ' +
    '[Learn more](https://web.dev/unused-css-rules).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

// Allow 10KB of unused CSS to permit `:hover` and other styles not used on a non-interactive load.
// @see https://github.com/GoogleChrome/lighthouse/issues/9353 for more discussion.
const IGNORE_THRESHOLD_IN_BYTES = 10 * 1024;

class UnusedCSSRules extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'unused-css-rules',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['CSSUsage', 'URL', 'devtoolsLogs', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Artifacts.NetworkRequest[]} _
   * @param {LH.Audit.Context} context
   * @return {Promise<ByteEfficiencyAudit.ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, _, context) {
    const unusedCssItems = await UnusedCSS.request({
      CSSUsage: artifacts.CSSUsage,
      URL: artifacts.URL,
      devtoolsLog: artifacts.devtoolsLogs[ByteEfficiencyAudit.DEFAULT_PASS],
    }, context);
    const items = unusedCssItems
      .filter(sheet => sheet && sheet.wastedBytes > IGNORE_THRESHOLD_IN_BYTES);

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

module.exports = UnusedCSSRules;
module.exports.UIStrings = UIStrings;
