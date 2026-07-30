/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {NetworkRequest} from '../../lib/network-request.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to serve web fonts using the WOFF2 format. This is displayed in a list of audit titles that Lighthouse generates. "WOFF2" is a web font file format and should not be translated. */
  title: 'Serve fonts in WOFF2 format',
  /** Description of a Lighthouse audit that tells the user why they should serve web fonts using the WOFF2 format. This is displayed after a user expands the section to see more. "TTF", "OTF", "WOFF", and "WOFF2" are web font file formats and should not be translated. No character length limits. */
  description: 'WOFF2 offers better compression than TTF, OTF, and WOFF, reducing font download sizes. Convert legacy font files to WOFF2 and update the `@font-face` declaration. [Learn how to optimize web fonts](https://web.dev/articles/font-best-practices#use_woff2).',
  /** Label for a column in a data table; entries in the column identify the detected web font file format. */
  columnFormat: 'Format',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 4 * 1024;

/**
 * Median savings derived from the W3C WOFF 2.0 evaluation report:
 *
 * - TTF: for every font, calculate `(originalBytes - woff2Bytes) / originalBytes`, then take
 *   the median. The report contains Google and Adobe TrueType corpora; 62.12% is the lower
 *   corpus median, from the 1,194-font Google corpus.
 * - OTF: use the same calculation for the 5,256-font Adobe CFF corpus. OTF is used as the
 *   network-level proxy for CFF outlines, producing a median of 49.69%.
 * - WOFF: the file does not reveal its outline type in a network record, so 13.51% is a
 *   deliberately conservative estimate. The WOFF2-over-WOFF1 medians in the report are:
 *   23.94% for the Google TrueType corpus, 26.79% for the Adobe TrueType corpus, and 13.51%
 *   for the Adobe CFF corpus. The lower CFF median is used to avoid overstating savings for
 *   WOFF files with CFF outlines. The report's 29.21% continuation-stream result is an overall
 *   reduction from a specific experiment, not a cross-corpus median, so it is not used here.
 *
 * For example, for a 100,000-byte font:
 * - TTF: estimated WOFF2 size is `round(100,000 * (1 - 0.6212)) = 37,880` bytes,
 *   saving 62,120 bytes.
 * - OTF: estimated WOFF2 size is `round(100,000 * (1 - 0.4969)) = 50,310` bytes,
 *   saving 49,690 bytes.
 * - WOFF: estimated WOFF2 size is `round(100,000 * (1 - 0.1351)) = 86,490` bytes,
 *   saving 13,510 bytes.
 *
 * @see https://www.w3.org/Fonts/WG/WOFF2ER/#brotli-google
 * @see https://www.w3.org/Fonts/WG/WOFF2ER/#brotli-adobe-cff
 * @see https://www.w3.org/Fonts/WG/WOFF2ER/#brotli-adobe-ttf
 */
const W3C_MEDIAN_SAVINGS_RATIOS = {
  ttf: 0.6212,
  otf: 0.4969,
  woff: 0.1351,
};

const MIME_FORMATS = new Map([
  ['font/ttf', 'ttf'],
  ['application/x-font-ttf', 'ttf'],
  ['font/otf', 'otf'],
  ['application/x-font-opentype', 'otf'],
  ['font/woff', 'woff'],
  ['application/font-woff', 'woff'],
  ['application/x-font-woff', 'woff'],
]);

const MODERN_MIME_TYPES = new Set([
  'font/woff2',
  'application/font-woff2',
  'application/x-font-woff2',
]);

class ModernFontFormats extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'modern-font-formats',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 3,
      requiredArtifacts: [
        'DevtoolsLog',
        'Trace',
        'GatherContext',
        'URL',
        'SourceMaps',
        'HostDPR',
      ],
    };
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {'ttf'|'otf'|'woff'|undefined}
   */
  static getFontFormat(record) {
    if (record.resourceType !== NetworkRequest.TYPES.Font) return;

    const mimeType = record.mimeType.toLowerCase().split(';', 1)[0].trim();
    if (MODERN_MIME_TYPES.has(mimeType)) return;

    const mimeFormat = MIME_FORMATS.get(mimeType);
    if (mimeFormat) return /** @type {'ttf'|'otf'|'woff'} */ (mimeFormat);

    let pathname;
    try {
      pathname = new URL(record.url).pathname;
    } catch {
      pathname = record.url.split(/[?#]/, 1)[0];
    }

    const extension = pathname.match(/\.(ttf|otf|woff)$/i)?.[1].toLowerCase();
    return /** @type {'ttf'|'otf'|'woff'|undefined} */ (extension);
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {LH.Audit.ByteEfficiencyItem & {format: string}|undefined}
   */
  static computeWaste(record) {
    const format = ModernFontFormats.getFontFormat(record);
    if (!format || NetworkRequest.isNonNetworkRequest(record)) return;

    const totalBytes = NetworkRequest.getResourceSizeOnNetwork(record);
    const savingsRatio = W3C_MEDIAN_SAVINGS_RATIOS[format];
    const estimatedWoff2Bytes = Math.round(totalBytes * (1 - savingsRatio));
    const wastedBytes = totalBytes - estimatedWoff2Bytes;
    const wastedPercent = totalBytes ? Math.round(wastedBytes / totalBytes * 10_000) / 100 : 0;

    return {
      url: record.url,
      format: format.toUpperCase(),
      totalBytes,
      wastedBytes,
      wastedPercent,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {import('./byte-efficiency-audit.js').ByteEfficiencyProduct}
   */
  static audit_(artifacts, networkRecords) {
    /** @type {Map<string, LH.Audit.ByteEfficiencyItem & {format: string}>} */
    const itemsByUrl = new Map();

    for (const record of networkRecords) {
      const item = ModernFontFormats.computeWaste(record);
      if (!item) continue;

      const existing = itemsByUrl.get(item.url);
      if (!existing || item.wastedBytes > existing.wastedBytes) {
        itemsByUrl.set(item.url, item);
      }
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'format', valueType: 'text', label: str_(UIStrings.columnFormat)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    const items = [...itemsByUrl.values()];
    const totalWastedBytes = items.reduce((sum, item) => sum + item.wastedBytes, 0);

    return {
      items: totalWastedBytes >= IGNORE_THRESHOLD_IN_BYTES ? items : [],
      headings,
    };
  }
}

export default ModernFontFormats;
export {
  IGNORE_THRESHOLD_IN_BYTES,
  UIStrings,
  W3C_MEDIAN_SAVINGS_RATIOS,
};
