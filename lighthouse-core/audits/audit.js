/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const statistics = require('../lib/statistics.js');
const Util = require('../report/html/renderer/util.js');

const DEFAULT_PASS = 'defaultPass';

/**
 * Clamp figure to 2 decimal places
 * @param {number} val
 * @return {number}
 */
const clampTo2Decimals = val => Math.round(val * 100) / 100;

class Audit {
  /**
   * @return {string}
   */
  static get DEFAULT_PASS() {
    return DEFAULT_PASS;
  }

  /**
   * @return {LH.Audit.ScoreDisplayModes}
   */
  static get SCORING_MODES() {
    return {
      NUMERIC: 'numeric',
      BINARY: 'binary',
      MANUAL: 'manual',
      INFORMATIVE: 'informative',
      NOT_APPLICABLE: 'notApplicable',
      ERROR: 'error',
    };
  }

  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    throw new Error('Audit meta information must be overridden.');
  }

  /**
   * @return {Object}
   */
  static get defaultOptions() {
    return {};
  }

  /* eslint-disable no-unused-vars */

  /**
   *
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.Audit.Product|Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    throw new Error('audit() method must be overriden');
  }

  /* eslint-enable no-unused-vars */

  /**
   * Computes a score between 0 and 1 based on the measured `value`. Score is determined by
   * considering a log-normal distribution governed by two control points (the 10th
   * percentile value and the median value) and represents the percentage of sites that are
   * greater than `value`.
   * @param {{median: number, p10: number}} controlPoints
   * @param {number} value
   * @return {number}
   */
  static computeLogNormalScore(controlPoints, value) {
    const percentile = statistics.getLogNormalScore(controlPoints, value);
    return clampTo2Decimals(percentile);
  }

  /**
   * @param {LH.Audit.Details.Table['headings']} headings
   * @param {LH.Audit.Details.Table['items']} results
   * @param {LH.Audit.Details.Table['summary']=} summary
   * @return {LH.Audit.Details.Table}
   */
  static makeTableDetails(headings, results, summary) {
    if (results.length === 0) {
      return {
        type: 'table',
        headings: [],
        items: [],
        summary,
      };
    }

    return {
      type: 'table',
      headings: headings,
      items: results,
      summary,
    };
  }

  /**
   * @param {LH.Audit.Details.List['items']} items
   * @returns {LH.Audit.Details.List}
   */
  static makeListDetails(items) {
    return {
      type: 'list',
      items: items,
    };
  }

  /** @typedef {{
   * content: string;
   * title: string;
   * lineMessages: LH.Audit.Details.SnippetValue['lineMessages'];
   * generalMessages: LH.Audit.Details.SnippetValue['generalMessages'];
   * node?: LH.Audit.Details.NodeValue;
   * maxLineLength?: number;
   * maxLinesAroundMessage?: number;
   * }} SnippetInfo */
  /**
   * @param {SnippetInfo} snippetInfo
   * @return {LH.Audit.Details.SnippetValue}
   */
  static makeSnippetDetails({
    content,
    title,
    lineMessages,
    generalMessages,
    node,
    maxLineLength = 200,
    maxLinesAroundMessage = 20,
  }) {
    const allLines = Audit._makeSnippetLinesArray(content, maxLineLength);
    const lines = Util.filterRelevantLines(allLines, lineMessages, maxLinesAroundMessage);
    return {
      type: 'snippet',
      lines,
      title,
      lineMessages,
      generalMessages,
      lineCount: allLines.length,
      node,
    };
  }

  /**
   * @param {string} content
   * @param {number} maxLineLength
   * @returns {LH.Audit.Details.SnippetValue['lines']}
   */
  static _makeSnippetLinesArray(content, maxLineLength) {
    return content.split('\n').map((line, lineIndex) => {
      const lineNumber = lineIndex + 1;
      /** @type LH.Audit.Details.SnippetValue['lines'][0] */
      const lineDetail = {
        content: line.slice(0, maxLineLength),
        lineNumber,
      };
      if (line.length > maxLineLength) {
        lineDetail.truncated = true;
      }
      return lineDetail;
    });
  }

  /**
   * @param {LH.Audit.Details.Opportunity['headings']} headings
   * @param {LH.Audit.Details.Opportunity['items']} items
   * @param {number} overallSavingsMs
   * @param {number=} overallSavingsBytes
   * @return {LH.Audit.Details.Opportunity}
   */
  static makeOpportunityDetails(headings, items, overallSavingsMs, overallSavingsBytes) {
    return {
      type: 'opportunity',
      headings: items.length === 0 ? [] : headings,
      items,
      overallSavingsMs,
      overallSavingsBytes,
    };
  }

  /**
   * @param {number|null} score
   * @param {LH.Audit.ScoreDisplayMode} scoreDisplayMode
   * @param {string} auditId
   * @return {number|null}
   */
  static _normalizeAuditScore(score, scoreDisplayMode, auditId) {
    if (scoreDisplayMode !== Audit.SCORING_MODES.BINARY &&
        scoreDisplayMode !== Audit.SCORING_MODES.NUMERIC) {
      return null;
    }

    // Otherwise, score must be a number in [0, 1].
    if (score === null || !Number.isFinite(score)) {
      throw new Error(`Invalid score for ${auditId}: ${score}`);
    }
    if (score > 1) throw new Error(`Audit score for ${auditId} is > 1`);
    if (score < 0) throw new Error(`Audit score for ${auditId} is < 0`);

    score = clampTo2Decimals(score);

    return score;
  }

  /**
   * @param {typeof Audit} audit
   * @param {string} errorMessage
   * @return {LH.Audit.Result}
   */
  static generateErrorAuditResult(audit, errorMessage) {
    return Audit.generateAuditResult(audit, {
      score: null,
      errorMessage,
    });
  }

  /**
   * @param {typeof Audit} audit
   * @param {LH.Audit.Product} product
   * @return {LH.Audit.Result}
   */
  static generateAuditResult(audit, product) {
    if (product.score === undefined) {
      throw new Error('generateAuditResult requires a score');
    }

    // Default to binary scoring.
    let scoreDisplayMode = audit.meta.scoreDisplayMode || Audit.SCORING_MODES.BINARY;

    // But override if product contents require it.
    if (product.errorMessage) {
      // Error result.
      scoreDisplayMode = Audit.SCORING_MODES.ERROR;
    } else if (product.notApplicable) {
      // Audit was determined to not apply to the page.
      scoreDisplayMode = Audit.SCORING_MODES.NOT_APPLICABLE;
    }

    const score = Audit._normalizeAuditScore(product.score, scoreDisplayMode, audit.meta.id);

    let auditTitle = audit.meta.title;
    if (audit.meta.failureTitle) {
      if (score !== null && score < Util.PASS_THRESHOLD) {
        auditTitle = audit.meta.failureTitle;
      }
    }

    // The Audit.Product type is bifurcated to enforce numericUnit accompanying numericValue;
    // the existence of `numericUnit` is our discriminant.
    // Make ts happy and enforce this contract programmatically by only pulling numericValue off of
    // a `NumericProduct` type.
    const numericProduct = 'numericUnit' in product ? product : undefined;

    return {
      id: audit.meta.id,
      title: auditTitle,
      description: audit.meta.description,

      score,
      scoreDisplayMode,
      numericValue: numericProduct && numericProduct.numericValue,
      numericUnit: numericProduct && numericProduct.numericUnit,

      displayValue: product.displayValue,
      explanation: product.explanation,
      errorMessage: product.errorMessage,
      warnings: product.warnings,

      details: product.details,
    };
  }
}

module.exports = Audit;
