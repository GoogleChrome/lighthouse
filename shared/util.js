/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as statistics from './statistics.js';

/** @typedef {import('../types/lhr/audit-details').default.SnippetValue} SnippetValue */

const ELLIPSIS = '\u2026';
const NBSP = '\xa0';
const PASS_THRESHOLD = 0.9;

const RATINGS = {
  PASS: {label: 'pass', minScore: PASS_THRESHOLD},
  AVERAGE: {label: 'average', minScore: 0.5},
  FAIL: {label: 'fail'},
  ERROR: {label: 'error'},
};

// 25 most used tld plus one domains (aka public suffixes) from http archive.
// @see https://github.com/GoogleChrome/lighthouse/pull/5065#discussion_r191926212
// The canonical list is https://publicsuffix.org/learn/ but we're only using subset to conserve bytes
const listOfTlds = [
  'com', 'co', 'gov', 'edu', 'ac', 'org', 'go', 'gob', 'or', 'net', 'in', 'ne', 'nic', 'gouv',
  'web', 'spb', 'blog', 'jus', 'kiev', 'mil', 'wi', 'qc', 'ca', 'bel', 'on',
];

class Util {
  static get RATINGS() {
    return RATINGS;
  }

  static get PASS_THRESHOLD() {
    return PASS_THRESHOLD;
  }

  static get MS_DISPLAY_VALUE() {
    return `%10d${NBSP}ms`;
  }

  /**
   * If LHR is older than 10.0 it will not have the `finalDisplayedUrl` property.
   * Old LHRs should have the `finalUrl` property which will work fine for the report.
   *
   * @param {LH.Result} lhr
   */
  static getFinalDisplayedUrl(lhr) {
    if (lhr.finalDisplayedUrl) return lhr.finalDisplayedUrl;
    if (lhr.finalUrl) return lhr.finalUrl;
    throw new Error('Could not determine final displayed URL');
  }

  /**
   * If LHR is older than 10.0 it will not have the `mainDocumentUrl` property.
   * Old LHRs should have the `finalUrl` property which is the same as `mainDocumentUrl`.
   *
   * @param {LH.Result} lhr
   */
  static getMainDocumentUrl(lhr) {
    return lhr.mainDocumentUrl || lhr.finalUrl;
  }

  /**
   * @param {LH.Result} lhr
   * @return {LH.Result.FullPageScreenshot=}
   */
  static getFullPageScreenshot(lhr) {
    if (lhr.fullPageScreenshot) {
      return lhr.fullPageScreenshot;
    }

    // Prior to 10.0.
    const details = /** @type {LH.Result.FullPageScreenshot=} */ (
      lhr.audits['full-page-screenshot']?.details);
    return details;
  }

  /**
   * Given the entity classification dataset and a URL, identify the entity.
   * @param {string} url
   * @param {LH.Result.Entities=} entities
   * @return {LH.Result.LhrEntity|string}
   */
  static getEntityFromUrl(url, entities) {
    // If it's a pre-v10 LHR, we don't have entities, so match against the root-ish domain
    if (!entities) {
      return Util.getPseudoRootDomain(url);
    }

    const entity = entities.find(e => e.origins.find(origin => url.startsWith(origin)));
    // This fallback case would be unexpected, but leaving for safety.
    return entity || Util.getPseudoRootDomain(url);
  }

  /**
   * Split a string by markdown code spans (enclosed in `backticks`), splitting
   * into segments that were enclosed in backticks (marked as `isCode === true`)
   * and those that outside the backticks (`isCode === false`).
   * @param {string} text
   * @return {Array<{isCode: true, text: string}|{isCode: false, text: string}>}
   */
  static splitMarkdownCodeSpans(text) {
    /** @type {Array<{isCode: true, text: string}|{isCode: false, text: string}>} */
    const segments = [];

    // Split on backticked code spans.
    const parts = text.split(/`(.*?)`/g);
    for (let i = 0; i < parts.length; i ++) {
      const text = parts[i];

      // Empty strings are an artifact of splitting, not meaningful.
      if (!text) continue;

      // Alternates between plain text and code segments.
      const isCode = i % 2 !== 0;
      segments.push({
        isCode,
        text,
      });
    }

    return segments;
  }

  /**
   * Split a string on markdown links (e.g. [some link](https://...)) into
   * segments of plain text that weren't part of a link (marked as
   * `isLink === false`), and segments with text content and a URL that did make
   * up a link (marked as `isLink === true`).
   * @param {string} text
   * @return {Array<{isLink: true, text: string, linkHref: string}|{isLink: false, text: string}>}
   */
  static splitMarkdownLink(text) {
    /** @type {Array<{isLink: true, text: string, linkHref: string}|{isLink: false, text: string}>} */
    const segments = [];

    const parts = text.split(/\[([^\]]+?)\]\((https?:\/\/.*?)\)/g);
    while (parts.length) {
      // Shift off the same number of elements as the pre-split and capture groups.
      const [preambleText, linkText, linkHref] = parts.splice(0, 3);

      if (preambleText) { // Skip empty text as it's an artifact of splitting, not meaningful.
        segments.push({
          isLink: false,
          text: preambleText,
        });
      }

      // Append link if there are any.
      if (linkText && linkHref) {
        segments.push({
          isLink: true,
          text: linkText,
          linkHref,
        });
      }
    }

    return segments;
  }

  /**
   * @param {string} string
   * @param {number} characterLimit
   * @param {string} ellipseSuffix
   */
  static truncate(string, characterLimit, ellipseSuffix = '…') {
    // Early return for the case where there are fewer bytes than the character limit.
    if (string.length <= characterLimit) {
      return string;
    }

    const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
    const iterator = segmenter.segment(string)[Symbol.iterator]();

    let lastSegmentIndex = 0;
    for (let i = 0; i <= characterLimit - ellipseSuffix.length; i++) {
      const result = iterator.next();
      if (result.done) {
        return string;
      }

      lastSegmentIndex = result.value.index;
    }

    for (let i = 0; i < ellipseSuffix.length; i++) {
      if (iterator.next().done) {
        return string;
      }
    }

    return string.slice(0, lastSegmentIndex) + ellipseSuffix;
  }

  /**
   * @param {URL} parsedUrl
   * @param {{numPathParts?: number, preserveQuery?: boolean, preserveHost?: boolean}=} options
   * @return {string}
   */
  static getURLDisplayName(parsedUrl, options) {
    // Closure optional properties aren't optional in tsc, so fallback needs undefined  values.
    options = options || {numPathParts: undefined, preserveQuery: undefined,
      preserveHost: undefined};
    const numPathParts = options.numPathParts !== undefined ? options.numPathParts : 2;
    const preserveQuery = options.preserveQuery !== undefined ? options.preserveQuery : true;
    const preserveHost = options.preserveHost || false;

    let name;

    if (parsedUrl.protocol === 'about:' || parsedUrl.protocol === 'data:') {
      // Handle 'about:*' and 'data:*' URLs specially since they have no path.
      name = parsedUrl.href;
    } else {
      name = parsedUrl.pathname;
      const parts = name.split('/').filter(part => part.length);
      if (numPathParts && parts.length > numPathParts) {
        name = ELLIPSIS + parts.slice(-1 * numPathParts).join('/');
      }

      if (preserveHost) {
        name = `${parsedUrl.host}/${name.replace(/^\//, '')}`;
      }
      if (preserveQuery) {
        name = `${name}${parsedUrl.search}`;
      }
    }

    const MAX_LENGTH = 64;
    if (parsedUrl.protocol !== 'data:') {
      // Even non-data uris can be 10k characters long.
      name = name.slice(0, 200);
      // Always elide hexadecimal hash
      name = name.replace(/([a-f0-9]{7})[a-f0-9]{13}[a-f0-9]*/g, `$1${ELLIPSIS}`);
      // Also elide other hash-like mixed-case strings
      name = name.replace(/([a-zA-Z0-9-_]{9})(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9-_]{10,}/g,
        `$1${ELLIPSIS}`);
      // Also elide long number sequences
      name = name.replace(/(\d{3})\d{6,}/g, `$1${ELLIPSIS}`);
      // Merge any adjacent ellipses
      name = name.replace(/\u2026+/g, ELLIPSIS);

      // Elide query params first
      if (name.length > MAX_LENGTH && name.includes('?')) {
        // Try to leave the first query parameter intact
        name = name.replace(/\?([^=]*)(=)?.*/, `?$1$2${ELLIPSIS}`);

        // Remove it all if it's still too long
        if (name.length > MAX_LENGTH) {
          name = name.replace(/\?.*/, `?${ELLIPSIS}`);
        }
      }
    }

    // Elide too long names next
    if (name.length > MAX_LENGTH) {
      const dotIndex = name.lastIndexOf('.');
      if (dotIndex >= 0) {
        name = name.slice(0, MAX_LENGTH - 1 - (name.length - dotIndex)) +
          // Show file extension
          `${ELLIPSIS}${name.slice(dotIndex)}`;
      } else {
        name = name.slice(0, MAX_LENGTH - 1) + ELLIPSIS;
      }
    }

    return name;
  }

  /**
   * Returns the origin portion of a Chrome extension URL.
   * @param {string} url
   * @return {string}
   */
  static getChromeExtensionOrigin(url) {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol + '//' + parsedUrl.host;
  }

  /**
   * Split a URL into a file, hostname and origin for easy display.
   * @param {string} url
   * @return {{file: string, hostname: string, origin: string}}
   */
  static parseURL(url) {
    const parsedUrl = new URL(url);
    return {
      file: Util.getURLDisplayName(parsedUrl),
      hostname: parsedUrl.hostname,
      // Node's URL parsing behavior is different than Chrome and returns 'null'
      // for chrome-extension:// URLs. See https://github.com/nodejs/node/issues/21955.
      origin: parsedUrl.protocol === 'chrome-extension:' ?
        Util.getChromeExtensionOrigin(url) : parsedUrl.origin,
    };
  }

  /**
   * @param {string|URL} value
   * @return {!URL}
   */
  static createOrReturnURL(value) {
    if (value instanceof URL) {
      return value;
    }

    return new URL(value);
  }

  /**
   * Gets the tld of a domain
   * This function is used only while rendering pre-10.0 LHRs.
   *
   * @param {string} hostname
   * @return {string} tld
   */
  static getPseudoTld(hostname) {
    const tlds = hostname.split('.').slice(-2);

    if (!listOfTlds.includes(tlds[0])) {
      return `.${tlds[tlds.length - 1]}`;
    }

    return `.${tlds.join('.')}`;
  }

  /**
   * Returns a primary domain for provided hostname (e.g. www.example.com -> example.com).
   * As it doesn't consult the Public Suffix List, it can sometimes lose detail.
   * See the `listOfTlds` comment above for more.
   * This function is used only while rendering pre-10.0 LHRs. See UrlUtils.getRootDomain
   * for the current method that makes use of PSL.
   * @param {string|URL} url hostname or URL object
   * @return {string}
   */
  static getPseudoRootDomain(url) {
    const hostname = Util.createOrReturnURL(url).hostname;
    const tld = Util.getPseudoTld(hostname);

    // tld is .com or .co.uk which means we means that length is 1 to big
    // .com => 2 & .co.uk => 3
    const splitTld = tld.split('.');

    // get TLD + root domain
    return hostname.split('.').slice(-splitTld.length).join('.');
  }

  /**
   * Returns only lines that are near a message, or the first few lines if there are
   * no line messages.
   * @param {SnippetValue['lines']} lines
   * @param {SnippetValue['lineMessages']} lineMessages
   * @param {number} surroundingLineCount Number of lines to include before and after
   * the message. If this is e.g. 2 this function might return 5 lines.
   */
  static filterRelevantLines(lines, lineMessages, surroundingLineCount) {
    if (lineMessages.length === 0) {
      // no lines with messages, just return the first bunch of lines
      return lines.slice(0, surroundingLineCount * 2 + 1);
    }

    const minGapSize = 3;
    const lineNumbersToKeep = new Set();
    // Sort messages so we can check lineNumbersToKeep to see how big the gap to
    // the previous line is.
    lineMessages = lineMessages.sort((a, b) => (a.lineNumber || 0) - (b.lineNumber || 0));
    lineMessages.forEach(({lineNumber}) => {
      let firstSurroundingLineNumber = lineNumber - surroundingLineCount;
      let lastSurroundingLineNumber = lineNumber + surroundingLineCount;

      while (firstSurroundingLineNumber < 1) {
        // make sure we still show (surroundingLineCount * 2 + 1) lines in total
        firstSurroundingLineNumber++;
        lastSurroundingLineNumber++;
      }
      // If only a few lines would be omitted normally then we prefer to include
      // extra lines to avoid the tiny gap
      if (lineNumbersToKeep.has(firstSurroundingLineNumber - minGapSize - 1)) {
        firstSurroundingLineNumber -= minGapSize;
      }
      for (let i = firstSurroundingLineNumber; i <= lastSurroundingLineNumber; i++) {
        const surroundingLineNumber = i;
        lineNumbersToKeep.add(surroundingLineNumber);
      }
    });

    return lines.filter(line => lineNumbersToKeep.has(line.lineNumber));
  }

  /**
   * Computes a score between 0 and 1 based on the measured `value`. Score is determined by
   * considering a log-normal distribution governed by two control points (the 10th
   * percentile value and the median value) and represents the percentage of sites that are
   * greater than `value`.
   *
   * Score characteristics:
   * - within [0, 1]
   * - rounded to two digits
   * - value must meet or beat a controlPoint value to meet or exceed its percentile score:
   *   - value > median will give a score < 0.5; value ≤ median will give a score ≥ 0.5.
   *   - value > p10 will give a score < 0.9; value ≤ p10 will give a score ≥ 0.9.
   * - values < p10 will get a slight boost so a score of 1 is achievable by a
   *   `value` other than those close to 0. Scores of > ~0.99524 end up rounded to 1.
   * @param {{median: number, p10: number}} controlPoints
   * @param {number} value
   * @return {number}
   */
  static computeLogNormalScore(controlPoints, value) {
    let percentile = statistics.getLogNormalScore(controlPoints, value);
    // Add a boost to scores of 90+, linearly ramping from 0 at 0.9 to half a
    // point (0.005) at 1. Expands scores in (0.9, 1] to (0.9, 1.005], so more top
    // scores will be a perfect 1 after the two-digit `Math.floor()` rounding below.
    if (percentile > 0.9) { // getLogNormalScore ensures `percentile` can't exceed 1.
      percentile += 0.05 * (percentile - 0.9);
    }
    return Math.floor(percentile * 100) / 100;
  }
}

export {
  Util,
};
