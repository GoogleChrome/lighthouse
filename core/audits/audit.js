/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {isUnderTest} from '../lib/lh-env.js';
import * as statistics from '../lib/statistics.js';
import {Util} from '../util.cjs';

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

  /**
   * This catches typos in the `key` property of a heading definition of table/opportunity details.
   * Throws an error if any of keys referenced by headings don't exist in at least one of the items.
   *
   * @param {LH.Audit.Details.Table['headings']|LH.Audit.Details.Opportunity['headings']} headings
   * @param {LH.Audit.Details.Opportunity['items']|LH.Audit.Details.Table['items']} items
   */
  static assertHeadingKeysExist(headings, items) {
    // If there are no items, there's nothing to check.
    if (!items.length) return;
    // Only do this in tests for now.
    if (!isUnderTest) return;

    for (const heading of headings) {
      // `null` heading key means it's a column for subrows only
      if (heading.key === null) continue;

      const key = heading.key;
      if (items.some(item => key in item)) continue;
      throw new Error(`"${heading.key}" is missing from items`);
    }
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

    Audit.assertHeadingKeysExist(headings, results);

    return {
      type: 'table',
      headings: headings,
      items: results,
      summary,
    };
  }

  /**
   * @param {LH.Audit.Details.List['items']} items
   * @return {LH.Audit.Details.List}
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
   * @return {LH.Audit.Details.SnippetValue['lines']}
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
    Audit.assertHeadingKeysExist(headings, items);

    return {
      type: 'opportunity',
      headings: items.length === 0 ? [] : headings,
      items,
      overallSavingsMs,
      overallSavingsBytes,
    };
  }

  /**
   * @param {LH.Artifacts.NodeDetails} node
   * @return {LH.Audit.Details.NodeValue}
   */
  static makeNodeItem(node) {
    return {
      type: 'node',
      lhId: node.lhId,
      path: node.devtoolsNodePath,
      selector: node.selector,
      boundingRect: node.boundingRect,
      snippet: node.snippet,
      nodeLabel: node.nodeLabel,
    };
  }

  /**
   * @param {LH.Artifacts.Bundle} bundle
   * @param {number} generatedLine
   * @param {number} generatedColumn
   * @return {LH.Audit.Details.SourceLocationValue['original']}
   */
  static _findOriginalLocation(bundle, generatedLine, generatedColumn) {
    const entry = bundle?.map.findEntry(generatedLine, generatedColumn);
    if (!entry) return;

    return {
      file: entry.sourceURL || '',
      line: entry.sourceLineNumber || 0,
      column: entry.sourceColumnNumber || 0,
    };
  }

  /**
   * @param {string} url
   * @param {number} line 0-indexed
   * @param {number} column 0-indexed
   * @param {LH.Artifacts.Bundle=} bundle
   * @return {LH.Audit.Details.SourceLocationValue}
   */
  static makeSourceLocation(url, line, column, bundle) {
    return {
      type: 'source-location',
      url,
      urlProvider: 'network',
      line,
      column,
      original: bundle && this._findOriginalLocation(bundle, line, column),
    };
  }

  /**
   * @param {LH.Artifacts.Script} script
   * @param {number} line 0-indexed
   * @param {number} column 0-indexed
   * @param {LH.Artifacts.Bundle=} bundle
   * @return {LH.Audit.Details.SourceLocationValue}
   */
  static makeSourceLocationFromScript(script, line, column, bundle) {
    if (script.url) {
      return this.makeSourceLocation(script.url, line, column, bundle);
    } else {
      return {
        type: 'source-location',
        url: script.name,
        urlProvider: 'comment',
        line,
        column,
        original: bundle && this._findOriginalLocation(bundle, line, column),
      };
    }
  }

  /**
   * @param {LH.Artifacts.ConsoleMessage} entry
   * @param {LH.Artifacts.Bundle=} bundle
   * @return {LH.Audit.Details.SourceLocationValue | undefined}
   */
  static makeSourceLocationFromConsoleMessage(entry, bundle) {
    if (!entry.url) return;

    const line = entry.lineNumber || 0;
    const column = entry.columnNumber || 0;
    return this.makeSourceLocation(entry.url, line, column, bundle);
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
   * @param {string | LH.IcuMessage} errorMessage
   * @return {LH.RawIcu<LH.Audit.Result>}
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
   * @return {LH.RawIcu<LH.Audit.Result>}
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
      numericValue: numericProduct?.numericValue,
      numericUnit: numericProduct?.numericUnit,

      displayValue: product.displayValue,
      explanation: product.explanation,
      errorMessage: product.errorMessage,
      warnings: product.warnings,

      details: product.details,
    };
  }
}

export {Audit};
