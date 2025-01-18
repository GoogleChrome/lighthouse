/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import {UnusedJavascriptSummary} from '../../computed/unused-javascript-summary.js';
import {JSBundles} from '../../computed/js-bundles.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {estimateCompressionRatioForContent} from '../../lib/script-helpers.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to reduce JavaScript that is never evaluated during page load. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Reduce unused JavaScript',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce JavaScript that is never needed/evaluated by the browser. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Reduce unused JavaScript and defer loading scripts until they are required to ' +
    'decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const UNUSED_BYTES_IGNORE_THRESHOLD = 20 * 1024;
const UNUSED_BYTES_IGNORE_BUNDLE_SOURCE_THRESHOLD = 512;

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
 * @param {string} string
 * @param {string} commonPrefix
 * @return {string}
 */
function trimCommonPrefix(string, commonPrefix) {
  if (!commonPrefix) return string;
  return string.startsWith(commonPrefix) ? '…' + string.slice(commonPrefix.length) : string;
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
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 1,
      requiredArtifacts: ['JsUsage', 'Scripts', 'SourceMaps', 'GatherContext',
        'devtoolsLogs', 'traces', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<import('./byte-efficiency-audit.js').ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords, context) {
    const bundles = await JSBundles.request(artifacts, context);
    const {
      unusedThreshold = UNUSED_BYTES_IGNORE_THRESHOLD,
      bundleSourceUnusedThreshold = UNUSED_BYTES_IGNORE_BUNDLE_SOURCE_THRESHOLD,
    } = context.options || {};

    /** @type {Map<string, number>} */
    const compressionRatioByUrl = new Map();

    const items = [];
    for (const [scriptId, scriptCoverage] of Object.entries(artifacts.JsUsage)) {
      const script = artifacts.Scripts.find(s => s.scriptId === scriptId);
      if (!script) continue; // This should never happen.

      const bundle = bundles.find(b => b.script.scriptId === scriptId);
      const unusedJsSummary =
        await UnusedJavascriptSummary.request({scriptId, scriptCoverage, bundle}, context);
      if (unusedJsSummary.wastedBytes === 0 || unusedJsSummary.totalBytes === 0) continue;

      const compressionRatio = estimateCompressionRatioForContent(
        compressionRatioByUrl, script.url, artifacts, networkRecords);
      /** @type {LH.Audit.ByteEfficiencyItem} */
      const item = {
        url: script.url,
        totalBytes: Math.round(compressionRatio * unusedJsSummary.totalBytes),
        wastedBytes: Math.round(compressionRatio * unusedJsSummary.wastedBytes),
        wastedPercent: unusedJsSummary.wastedPercent,
      };

      if (item.wastedBytes <= unusedThreshold) continue;
      items.push(item);

      // If there was an error calculating the bundle sizes, we can't
      // create any sub-items.
      if (!bundle || 'errorMessage' in bundle.sizes) continue;
      const sizes = bundle.sizes;

      // Augment with bundle data.
      if (unusedJsSummary.sourcesWastedBytes) {
        const topUnusedSourceSizes = Object.entries(unusedJsSummary.sourcesWastedBytes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([source, unused]) => {
            const total = source === '(unmapped)' ? sizes.unmappedBytes : sizes.files[source];
            return {
              source,
              unused: Math.round(unused * compressionRatio),
              total: Math.round(total * compressionRatio),
            };
          })
          .filter(d => d.unused >= bundleSourceUnusedThreshold);

        const commonSourcePrefix = commonPrefix(bundle.map.sourceURLs());
        item.subItems = {
          type: 'subitems',
          items: topUnusedSourceSizes.map(({source, unused, total}) => {
            return {
              source: trimCommonPrefix(source, commonSourcePrefix),
              sourceBytes: total,
              sourceWastedBytes: unused,
            };
          }),
        };
      }
    }

    return {
      items,
      headings: [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', subItemsHeading: {key: 'source', valueType: 'code'}, label: str_(i18n.UIStrings.columnURL)},
        {key: 'totalBytes', valueType: 'bytes', subItemsHeading: {key: 'sourceBytes'}, label: str_(i18n.UIStrings.columnTransferSize)},
        {key: 'wastedBytes', valueType: 'bytes', subItemsHeading: {key: 'sourceWastedBytes'}, label: str_(i18n.UIStrings.columnWastedBytes)},
        /* eslint-enable max-len */
      ],
    };
  }
}

export default UnusedJavaScript;
export {UIStrings};
