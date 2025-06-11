/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {computeJSTokenLength as computeTokenLength} from '../../lib/minification-estimator.js';
import {estimateCompressedContentSize, getRequestForScript, isInline} from '../../lib/script-helpers.js';
import {Util} from '../../../shared/util.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to minify the page’s JS code to reduce file size. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Minify JavaScript',
  /** Description of a Lighthouse audit that tells the user *why* they should minify the page’s JS code to reduce file size. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Minifying JavaScript files can reduce payload sizes and script parse time. ' +
    '[Learn how to minify JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unminified-javascript/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 3,
      requiredArtifacts: ['Scripts', 'DevtoolsLog', 'Trace', 'GatherContext', 'URL',
        'SourceMaps'],
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

    const totalBytes = estimateCompressedContentSize(networkRecord, contentLength, 'Script');
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
   * @return {import('./byte-efficiency-audit.js').ByteEfficiencyProduct}
   */
  static audit_(artifacts, networkRecords) {
    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    const warnings = [];
    for (const script of artifacts.Scripts) {
      if (!script.content) continue;

      const networkRecord = getRequestForScript(networkRecords, script);

      const displayUrl = isInline(script) ?
        `inline: ${Util.truncate(script.content, 40)}` :
        script.url;
      try {
        const result = UnminifiedJavaScript.computeWaste(script.content, displayUrl, networkRecord);
        // If the ratio is minimal, the file is likely already minified, so ignore it.
        // If the total number of bytes to be saved is quite small, it's also safe to ignore.
        if (result.wastedPercent < IGNORE_THRESHOLD_IN_PERCENT ||
          result.wastedBytes < IGNORE_THRESHOLD_IN_BYTES ||
          !Number.isFinite(result.wastedBytes)) continue;
        items.push(result);
      } catch (err) {
        warnings.push(`Unable to process script ${script.url}: ${err.message}`);
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

export default UnminifiedJavaScript;
export {UIStrings};
