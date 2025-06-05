/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/*
 * @fileoverview Audit a page to ensure that videos are used instead of animated gifs
 */


import {NetworkRequest} from '../../lib/network-request.js';
import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to use video formats rather than animated GIFs, which are wasteful. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Use video formats for animated content',
  /** Description of a Lighthouse audit that tells the user *why* they should use video instead of GIF format for delivering animated content. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Large GIFs are inefficient for delivering animated content. Consider using ' +
    'MPEG4/WebM videos for animations and PNG/WebP for static images instead of GIF to save ' +
    'network bytes. [Learn more about efficient video formats](https://developer.chrome.com/docs/lighthouse/performance/efficient-animated-content/)',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

// If GIFs are above this size, we'll flag them
// See https://github.com/GoogleChrome/lighthouse/pull/4885#discussion_r178406623 and https://github.com/GoogleChrome/lighthouse/issues/4696#issuecomment-370979920
const GIF_BYTE_THRESHOLD = 100 * 1024;

class EfficientAnimatedContent extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'efficient-animated-content',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 3,
      requiredArtifacts: ['DevtoolsLog', 'Trace', 'GatherContext', 'URL', 'SourceMaps'],
    };
  }

  /**
   * Calculate rough savings percentage based on 1000 real gifs transcoded to video
   * @param {number} bytes
   * @return {number} rough savings percentage
   * @see https://github.com/GoogleChrome/lighthouse/issues/4696#issuecomment-380296510 bytes
   */
  static getPercentSavings(bytes) {
    return Math.round((29.1 * Math.log10(bytes) - 100.7)) / 100;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {import('./byte-efficiency-audit.js').ByteEfficiencyProduct}
   */
  static audit_(artifacts, networkRecords) {
    const unoptimizedContent = networkRecords.filter(
      record => record.mimeType === 'image/gif' &&
        record.resourceType === NetworkRequest.TYPES.Image &&
        (record.resourceSize || 0) > GIF_BYTE_THRESHOLD
    );

    /** @type {Array<{url: string, totalBytes: number, wastedBytes: number}>}*/
    const items = unoptimizedContent.map(record => {
      const resourceSize = record.resourceSize || 0;
      return {
        url: record.url,
        totalBytes: resourceSize,
        wastedBytes: Math.round(resourceSize *
          EfficientAnimatedContent.getPercentSavings(resourceSize)),
      };
    });

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnResourceSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    return {
      items,
      headings,
    };
  }
}

export default EfficientAnimatedContent;
export {UIStrings};
