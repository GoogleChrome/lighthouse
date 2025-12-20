/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const UnusedJavaScriptSummary = require('../../computed/unused-javascript-summary.js');
const JsBundles = require('../../computed/js-bundles.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to remove JavaScript that is never evaluated during page load. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Remove unused JavaScript',
  /** Description of a Lighthouse audit that tells the user *why* they should remove JavaScript that is never needed/evaluated by the browser. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Remove unused JavaScript to reduce bytes consumed by network activity. ' +
    '[Learn more](https://web.dev/remove-unused-code/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 2048;
const IGNORE_BUNDLE_SOURCE_THRESHOLD_IN_BYTES = 512;

/**
 * @param {string[]} strings
 */
function commonPrefix(strings) {
  if (!strings.length) {
    return '';
  }

  const maxWord = strings.reduce((a, b) => a > b ? a : b);
  let prefix = strings.reduce((a, b) => a > b ? b : a);
  while (!maxWord.startsWith(prefix)) {
    prefix = prefix.slice(0, -1);
  }

  return prefix;
}

/**
 * @param {string[]} strings
 * @param {string} commonPrefix
 * @return {string[]}
 */
function trimCommonPrefix(strings, commonPrefix) {
  if (!commonPrefix) return strings;
  return strings.map(s => s.startsWith(commonPrefix) ? '…' + s.slice(commonPrefix.length) : s);
}

/**
 * @typedef WasteData
 * @property {Uint8Array} unusedByIndex
 * @property {number} unusedLength
 * @property {number} contentLength
 */

class UnusedJavaScript extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'unused-javascript',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['JsUsage', 'ScriptElements', 'devtoolsLogs', 'traces'],
      __internalOptionalArtifacts: ['SourceMaps'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<ByteEfficiencyAudit.ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords, context) {
    const bundles = artifacts.SourceMaps ? await JsBundles.request(artifacts, context) : [];
    const {bundleSourceUnusedThreshold = IGNORE_BUNDLE_SOURCE_THRESHOLD_IN_BYTES} =
      context.options || {};

    const items = [];
    for (const [url, scriptCoverages] of Object.entries(artifacts.JsUsage)) {
      const networkRecord = networkRecords.find(record => record.url === url);
      if (!networkRecord) continue;
      const bundle = bundles.find(b => b.script.src === url);
      const unusedJsSummary =
        await UnusedJavaScriptSummary.request({url, scriptCoverages, bundle}, context);

      const transfer = ByteEfficiencyAudit
        .estimateTransferSize(networkRecord, unusedJsSummary.totalBytes, 'Script');
      const transferRatio = transfer / unusedJsSummary.totalBytes;
      const item = {
        url: unusedJsSummary.url,
        totalBytes: Math.round(transferRatio * unusedJsSummary.totalBytes),
        wastedBytes: Math.round(transferRatio * unusedJsSummary.wastedBytes),
        wastedPercent: unusedJsSummary.wastedPercent,
      };

      if (item.wastedBytes <= IGNORE_THRESHOLD_IN_BYTES) continue;

      // Augment with bundle data.
      if (bundle && unusedJsSummary.sourcesWastedBytes) {
        const topUnusedSourceSizes = Object.entries(unusedJsSummary.sourcesWastedBytes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([source, unused]) => {
            const total =
              source === '(unmapped)' ? bundle.sizes.unmappedBytes : bundle.sizes.files[source];
            return {
              source,
              unused: Math.round(unused * transferRatio),
              total: Math.round(total * transferRatio),
            };
          })
          .filter(d => d.unused >= bundleSourceUnusedThreshold);

        const commonSourcePrefix = commonPrefix([...bundle.map._sourceInfos.keys()]);
        Object.assign(item, {
          sources: trimCommonPrefix(topUnusedSourceSizes.map(d => d.source), commonSourcePrefix),
          sourceBytes: topUnusedSourceSizes.map(d => d.total),
          sourceWastedBytes: topUnusedSourceSizes.map(d => d.unused),
        });
      }

      items.push(item);
    }

    return {
      items,
      headings: [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', subRows: {key: 'sources', valueType: 'code'}, label: str_(i18n.UIStrings.columnURL)},
        {key: 'totalBytes', valueType: 'bytes', subRows: {key: 'sourceBytes'}, label: str_(i18n.UIStrings.columnTransferSize)},
        {key: 'wastedBytes', valueType: 'bytes', subRows: {key: 'sourceWastedBytes'}, label: str_(i18n.UIStrings.columnWastedBytes)},
        /* eslint-enable max-len */
      ],
    };
  }
}

module.exports = UnusedJavaScript;
module.exports.UIStrings = UIStrings;
