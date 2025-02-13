/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../types/lh.js';
import {isUnderTest} from '../lib/lh-env.js';
import {Util} from '../../shared/util.js';

const DEFAULT_PASS = 'defaultPass';

/** @type {Record<keyof LH.Audit.ProductMetricSavings, number>} */
const METRIC_SAVINGS_PRECISION = {
  FCP: 50,
  LCP: 50,
  INP: 50,
  TBT: 50,
  CLS: 0.001,
};

/**
 * @typedef TableOptions
 * @property {number=} wastedMs
 * @property {number=} wastedBytes
 * @property {LH.Audit.Details.Table['sortedBy']=} sortedBy
 * @property {LH.Audit.Details.Table['skipSumming']=} skipSumming
 * @property {LH.Audit.Details.Table['isEntityGrouped']=} isEntityGrouped
 */

/**
 * @typedef OpportunityOptions
 * @property {number} overallSavingsMs
 * @property {number=} overallSavingsBytes
 * @property {LH.Audit.Details.Opportunity['sortedBy']=} sortedBy
 * @property {LH.Audit.Details.Opportunity['skipSumming']=} skipSumming
 * @property {LH.Audit.Details.Opportunity['isEntityGrouped']=} isEntityGrouped
 */

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
      METRIC_SAVINGS: 'metricSavings',
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
    throw new Error('audit() method must be overridden');
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
    return Util.computeLogNormalScore(controlPoints, value);
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
   * @param {LH.Audit.Details.Checklist['items']} items
   * @return {LH.Audit.Details.Checklist}
   */
  static makeChecklistDetails(items) {
    return {
      type: 'checklist',
      items,
    };
  }

  /**
   * @param {LH.Audit.Details.Table['headings']} headings
   * @param {LH.Audit.Details.Table['items']} results
   * @param {TableOptions=} options
   * @return {LH.Audit.Details.Table}
   */
  static makeTableDetails(headings, results, options = {}) {
    const {wastedBytes, wastedMs, sortedBy, skipSumming, isEntityGrouped} = options;
    const summary = (wastedBytes || wastedMs) ? {wastedBytes, wastedMs} : undefined;
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
      sortedBy,
      skipSumming,
      isEntityGrouped,
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
        content: Util.truncate(line, maxLineLength),
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
   * @param {OpportunityOptions} options
   * @return {LH.Audit.Details.Opportunity}
   */
  static makeOpportunityDetails(headings, items, options) {
    Audit.assertHeadingKeysExist(headings, items);
    const {overallSavingsMs, overallSavingsBytes, sortedBy, skipSumming, isEntityGrouped} = options;

    return {
      type: 'opportunity',
      headings: items.length === 0 ? [] : headings,
      items,
      overallSavingsMs,
      overallSavingsBytes,
      sortedBy,
      skipSumming,
      isEntityGrouped,
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
    if (scoreDisplayMode === Audit.SCORING_MODES.INFORMATIVE) {
      return 1;
    }

    if (scoreDisplayMode !== Audit.SCORING_MODES.BINARY &&
        scoreDisplayMode !== Audit.SCORING_MODES.NUMERIC &&
        scoreDisplayMode !== Audit.SCORING_MODES.METRIC_SAVINGS) {
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
   * @param {LH.Audit.ProductMetricSavings|undefined} metricSavings
   * @return {LH.Audit.ProductMetricSavings|undefined}
   */
  static _quantizeMetricSavings(metricSavings) {
    if (!metricSavings) return;

    /** @type {LH.Audit.ProductMetricSavings} */
    const normalizedMetricSavings = {...metricSavings};

    // eslint-disable-next-line max-len
    for (const key of /** @type {Array<keyof LH.Audit.ProductMetricSavings>} */ (Object.keys(metricSavings))) {
      let value = metricSavings[key];
      if (value === undefined) continue;

      value = Math.max(value, 0);

      const precision = METRIC_SAVINGS_PRECISION[key];
      if (precision !== undefined) {
        value = Math.round(value / precision) * precision;
      }

      normalizedMetricSavings[key] = value;
    }

    return normalizedMetricSavings;
  }

  /**
   * @param {typeof Audit} audit
   * @param {string | LH.IcuMessage} errorMessage
   * @param {string=} errorStack
   * @return {LH.RawIcu<LH.Audit.Result>}
   */
  static generateErrorAuditResult(audit, errorMessage, errorStack) {
    return Audit.generateAuditResult(audit, {
      score: null,
      errorMessage,
      errorStack,
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
    let score = product.score;

    // But override if product contents require it.
    if (product.errorMessage !== undefined) {
      // Error result.
      scoreDisplayMode = Audit.SCORING_MODES.ERROR;
    } else if (product.notApplicable) {
      // Audit was determined to not apply to the page.
      scoreDisplayMode = Audit.SCORING_MODES.NOT_APPLICABLE;
    } else if (product.scoreDisplayMode) {
      scoreDisplayMode = product.scoreDisplayMode;
    }

    const metricSavings = Audit._quantizeMetricSavings(product.metricSavings);
    const hasSomeSavings = Object.values(metricSavings || {}).some(v => v);

    if (scoreDisplayMode === Audit.SCORING_MODES.METRIC_SAVINGS) {
      if (score && score >= Util.PASS_THRESHOLD) {
        score = 1;
      } else if (hasSomeSavings) {
        score = 0;
      } else {
        score = 0.5;
      }
    }

    score = Audit._normalizeAuditScore(score, scoreDisplayMode, audit.meta.id);

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
      errorStack: product.errorStack,
      warnings: product.warnings,
      scoringOptions: product.scoringOptions,
      metricSavings,

      details: product.details,
      guidanceLevel: audit.meta.guidanceLevel,
      replacesAudits: audit.meta.replacesAudits,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @returns {LH.Artifacts.MetricComputationDataInput}
   */
  static makeMetricComputationDataInput(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const gatherContext = artifacts.GatherContext;
    return {trace, devtoolsLog, gatherContext, settings: context.settings, URL: artifacts.URL};
  }
}

export {Audit};
