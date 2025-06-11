/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';

import {LH_ROOT} from '../../../shared/root.js';

/* eslint-disable max-len */

// TODO: If we need to touch these again, it's time to make lantern.d.ts :)
// @see https://github.com/GoogleChrome/lighthouse/pull/10279#discussion_r373116456

/**
 * @typedef LanternSiteDefinition
 * @property {string} url
 * @property {TargetMetrics} wpt3g
 * @property {LanternMetrics} lantern
 * @property {LanternMetrics} [baseline]
 */

/**
 * @typedef LanternEvaluation
 * @property {string} url
 * @property {string} metric
 * @property {string} lanternMetric
 * @property {number} expected
 * @property {number} actual
 * @property {number} diff
 * @property {number} diffAsPercent
 */

/**
 * @typedef EstimateEvaluationSummary
 * @property {LanternEvaluation[]} [evaluations]
 * @property {number} p50
 * @property {number} p90
 * @property {number} p95
 */

/**
 * @typedef TargetMetrics
 * @property {number} [firstContentfulPaint]
 * @property {number} [timeToFirstInteractive]
 * @property {number} [timeToConsistentlyInteractive]
 * @property {number} [speedIndex]
 * @property {number} [largestContentfulPaint]
 * @property {number} [timeToFirstByte]
 * @property {number} [largestContentfulPaintLoadStart]
 * @property {number} [largestContentfulPaintLoadEnd]
 */

/**
 * @typedef LanternMetrics
 * @property {number} optimisticFCP
 * @property {number} optimisticFMP
 * @property {number} optimisticSI
 * @property {number} optimisticTTI
 * @property {number} optimisticLCP
 * @property {number} pessimisticFCP
 * @property {number} pessimisticFMP
 * @property {number} pessimisticSI
 * @property {number} pessimisticTTI
 * @property {number} pessimisticLCP
 * @property {number} roughEstimateOfFCP
 * @property {number} roughEstimateOfSI
 * @property {number} roughEstimateOfTTI
 * @property {number} roughEstimateOfLCP
 * @property {number} roughEstimateOfTTFB
 * @property {number} roughEstimateOfLCPLoadStart
 * @property {number} roughEstimateOfLCPLoadEnd
 */

/** @type {Array<string>} */
const WARNINGS = [];

export default {
  WARNINGS,
  // prettier-ignore
  SITE_INDEX_WITH_GOLDEN_PATH: './lantern-data/site-index-plus-golden-expectations.json',
  // prettier-ignore
  SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH: path.join(LH_ROOT, '.tmp/site-index-plus-golden-expectations-plus-computed.json'),
  // prettier-ignore
  BASELINE_COMPUTED_PATH: path.join(LH_ROOT, 'core/test/fixtures/lantern-baseline-computed-values.json'),
  // prettier-ignore
  BASELINE_ACCURACY_PATH: path.join(LH_ROOT, 'core/test/fixtures/lantern-baseline-accuracy.json'),
  /**
   * @param {{sites: Array<LanternSiteDefinition>}} siteIndexWithComputed
   * @param {{sites: Array<LanternMetrics & {url: string}>}} baselineLanternData
   */
  combineBaselineAndComputedDatasets(siteIndexWithComputed, baselineLanternData) {
    for (const site of baselineLanternData.sites) {
      const computedSite = siteIndexWithComputed.sites.find(entry => entry.url === site.url);
      if (!computedSite) continue;
      computedSite.baseline = site;
    }

    const entries = siteIndexWithComputed.sites.filter(site => site.lantern && site.baseline);

    if (!entries.length) {
      throw new Error('No lantern metrics available, did you run run-on-all-assets.js?');
    }

    return entries;
  },

  /**
   * @param {LanternSiteDefinition} site
   * @param {TargetMetrics} expectedMetrics
   * @param {LanternMetrics} actualMetrics
   * @param {keyof TargetMetrics} metric
   * @param {keyof LanternMetrics} lanternMetric
   * @return {(LanternEvaluation & LanternSiteDefinition)|null}
   */
  evaluateSite(site, expectedMetrics, actualMetrics, metric, lanternMetric) {
    const expectedRaw = expectedMetrics[metric];
    if (expectedRaw === undefined) return null;

    const expected = Math.round(expectedRaw);
    if (expected === 0) return null;

    const actual = Math.round(actualMetrics[lanternMetric]);
    const diff = Math.abs(actual - expected);
    const diffAsPercent = diff / expected;

    return {
      ...site,
      expected,
      actual,
      diff,
      diffAsPercent,
      metric,
      lanternMetric,
    };
  },

  /**
   * @param {LanternSiteDefinition[]} entries
   * @param {keyof TargetMetrics} metric
   * @param {keyof LanternMetrics} lanternMetric
   * @param {'lantern'|'baseline'} lanternOrBaseline
   * @return {EstimateEvaluationSummary}
   */
  evaluateAccuracy(entries, metric, lanternMetric, lanternOrBaseline = 'lantern') {
    const evaluations = [];

    const percentErrors = [];
    for (const entry of entries) {
      const actualMetrics = entry[lanternOrBaseline];
      if (!actualMetrics) throw new Error(`No metrics for ${metric} ${lanternMetric} ${lanternOrBaseline}`);

      const evaluation = this.evaluateSite(
        entry,
        entry.wpt3g,
        actualMetrics,
        metric,
        lanternMetric
      );

      // No data was available at all, skip it.
      if (!evaluation) continue;

      // Data was supposed to be available, but one metric was missing, warn.
      if (!Number.isFinite(evaluation.diff)) {
        const missingMetric = Number.isFinite(entry.wpt3g[metric]) ? lanternMetric : metric;
        const message = `WARNING: ${evaluation.url} was missing values for ${missingMetric}`;
        WARNINGS.push(message);
        continue;
      }

      evaluations.push(evaluation);
      percentErrors.push(evaluation.diffAsPercent);
    }

    percentErrors.sort((a, b) => a - b);

    const p50 = percentErrors[Math.floor((percentErrors.length / 100) * 50)];
    const p90 = percentErrors[Math.floor((percentErrors.length / 100) * 90)];
    const p95 = percentErrors[Math.floor((percentErrors.length / 100) * 95)];
    return {evaluations, p50, p90, p95};
  },
  /**
   * @param {{sites: Array<LanternSiteDefinition>}} siteIndexWithComputed
   * @param {{sites: Array<LanternMetrics & {url: string}>}} baselineData
   */
  evaluateAllMetrics(siteIndexWithComputed, baselineData) {
    const entries = this.combineBaselineAndComputedDatasets(siteIndexWithComputed, baselineData);
    /** @param {keyof TargetMetrics} metric @param {keyof LanternMetrics} lanternMetric */
    const evaluate = (metric, lanternMetric) => {
      const result = this.evaluateAccuracy(entries, metric, lanternMetric);
      delete result.evaluations;
      return result;
    };

    return {
      roughEstimateOfFCP: evaluate('firstContentfulPaint', 'roughEstimateOfFCP'),
      roughEstimateOfSI: evaluate('speedIndex', 'roughEstimateOfSI'),
      roughEstimateOfTTI: evaluate('timeToConsistentlyInteractive', 'roughEstimateOfTTI'),
      roughEstimateOfLCP: evaluate('largestContentfulPaint', 'roughEstimateOfLCP'),
      // TODO: enable when new traces are collected.
      // roughEstimateOfTTFB: evaluate('timeToFirstByte', 'roughEstimateOfTTFB'),
      // roughEstimateOfLCPLoadStart: evaluate('largestContentfulPaintLoadStart', 'roughEstimateOfLCPLoadStart'),
      // roughEstimateOfLCPLoadEnd: evaluate('largestContentfulPaintLoadEnd', 'roughEstimateOfLCPLoadEnd'),
    };
  },
};
