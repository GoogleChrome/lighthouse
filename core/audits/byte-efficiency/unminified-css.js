/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import {UnusedCSS} from '../../computed/unused-css.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {computeCSSTokenLength as computeTokenLength} from '../../lib/minification-estimator.js';
import {estimateTransferSize} from '../../lib/script-helpers.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to minify (remove whitespace) the page's CSS code. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Minify CSS',
  /** Description of a Lighthouse audit that tells the user *why* they should minify (remove whitespace) the page's CSS code. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Minifying CSS files can reduce network payload sizes. ' +
    '[Learn how to minify CSS](https://developer.chrome.com/docs/lighthouse/performance/unminified-css/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 3,
      requiredArtifacts: ['Stylesheets', 'DevtoolsLog', 'Trace', 'URL', 'GatherContext',
        'SourceMaps'],
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
   * @param {LH.Artifacts.NetworkRequest|undefined} networkRecord
   * @return {{url: string, totalBytes: number, wastedBytes: number, wastedPercent: number}}
   */
  static computeWaste(stylesheet, networkRecord) {
    const content = stylesheet.content;
    const totalTokenLength = UnminifiedCSS.computeTokenLength(content);

    let url = stylesheet.header.sourceURL;
    if (!url || stylesheet.header.isInline) {
      const contentPreview = UnusedCSS.determineContentPreview(stylesheet.content);
      url = contentPreview;
    }

    const totalBytes = estimateTransferSize(networkRecord, content.length, 'Stylesheet');
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
   * @return {import('./byte-efficiency-audit.js').ByteEfficiencyProduct}
   */
  static audit_(artifacts, networkRecords) {
    const items = [];
    for (const stylesheet of artifacts.Stylesheets) {
      const networkRecord = networkRecords
        .find(record => record.url === stylesheet.header.sourceURL);
      if (!stylesheet.content) continue;

      const result = UnminifiedCSS.computeWaste(stylesheet, networkRecord);

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

export default UnminifiedCSS;
export {UIStrings};
