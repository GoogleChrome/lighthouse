/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FormattedIcu} from './i18n.js';
import AuditDetails from './audit-details.js';

interface ScoreDisplayModes {
  /** Scores of 0-1 (map to displayed scores of 0-100). */
  NUMERIC: 'numeric';
  /** Pass/fail audit (0 and 1 are only possible scores). */
  BINARY: 'binary';
  /**
   * Audit result score is determined by the metric savings and product score:
   * 1   - audit passed based on product score
   * 0.5 - audit failed and had no metric savings
   * 0   - audit failed and had metric savings
   */
  METRIC_SAVINGS: 'metricSavings';
  /** The audit exists only to tell you to review something yourself. Score is null and should be ignored. */
  MANUAL: 'manual';
  /** The audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored. */
  INFORMATIVE: 'informative';
  /** The audit turned out to not apply to the page. Score is null and should be ignored. */
  NOT_APPLICABLE: 'notApplicable';
  /** There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored. */
  ERROR: 'error';
}

type ScoreDisplayMode = ScoreDisplayModes[keyof ScoreDisplayModes];

export type MetricSavings = Partial<Record<string, number>>;

/** Audit result returned in Lighthouse report. All audits offer a description and score of 0-1. */
export interface Result {
  displayValue?: string;
  /** An explanation of why the audit failed on the test page. */
  explanation?: string;
  /** Error message from any exception thrown while running this audit. */
  errorMessage?: string;
  /** Error stack from any exception thrown while running this audit. */
  errorStack?: string;
  warnings?: string[];
  /** The scored value of the audit, provided in the range `0-1`, or null if `scoreDisplayMode` indicates not scored. */
  score: number|null;
  /**
   * A string identifying how the score should be interpreted:
   * - 'binary': pass/fail audit (0 and 1 are only possible scores).
   * - 'numeric': scores of 0-1 (map to displayed scores of 0-100).
   * - 'informative': the audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored.
   * - 'notApplicable': the audit turned out to not apply to the page. Score is null and should be ignored.
   * - 'manual': The audit exists only to tell you to review something yourself. Score is null and should be ignored.
   * - 'error': There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored.
   */
  scoreDisplayMode: ScoreDisplayMode;
  /** Short, user-visible title for the audit. The text can change depending on if the audit passed or failed. */
  title: string;
  /** The string identifier of the audit, in kebab case. */
  id: string;
  /** A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit; markdown links supported. */
  description: string;
  /** A numeric value that has a meaning specific to the audit, e.g. the number of nodes in the DOM or the timestamp of a specific load event. More information can be found in the audit details, if present. */
  numericValue?: number;
  /** The unit of `numericValue`, used when the consumer wishes to convert numericValue to a display string. */
  numericUnit?: string;
  /** Extra information about the page provided by some types of audits, in one of several possible forms that can be rendered in the HTML report. */
  details?: FormattedIcu<AuditDetails>;
  /** Estimates of how much this audit affects various performance metrics. Values will be in the unit of the respective metrics. */
  metricSavings?: MetricSavings
  /** Score details including p10 and median for calculating an audit's log-normal score. */
  scoringOptions?: {
    p10: number;
    median: number;
  };
  /** A number indicating how much guidance Lighthouse provides to solve the problem in this audit on a 1-3 scale. Higher means more guidance. */
  guidanceLevel?: number;
}
