/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview Audit a page to ensure that videos are used instead of animated gifs
 */
'use strict';

const NetworkRequest = require('../../lib/network-request.js');
const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to use video formats rather than animated GIFs, which are wasteful. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Use video formats for animated content',
  /** Description of a Lighthouse audit that tells the user *why* they should use video instead of GIF format for delivering animated content. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Large GIFs are inefficient for delivering animated content. Consider using ' +
    'MPEG4/WebM videos for animations and PNG/WebP for static images instead of GIF to save ' +
    'network bytes. [Learn more](https://web.dev/efficient-animated-content)',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs', 'traces'],
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
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
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

module.exports = EfficientAnimatedContent;
module.exports.UIStrings = UIStrings;
