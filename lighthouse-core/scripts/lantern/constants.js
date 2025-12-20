/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');

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
 * @property {LanternEvaluation[]} evaluations
 * @property {number} p50
 * @property {number} p90
 * @property {number} p95
 */

/**
 * @typedef TargetMetrics
 * @property {number} [firstContentfulPaint]
 * @property {number} [firstMeaningfulPaint]
 * @property {number} [timeToFirstInteractive]
 * @property {number} [timeToConsistentlyInteractive]
 * @property {number} [speedIndex]
 * @property {number} [largestContentfulPaint]
 */

/**
 * @typedef LanternMetrics
 * @property {number} optimisticFCP
 * @property {number} optimisticFMP
 * @property {number} optimisticSI
 * @property {number} optimisticTTFCPUI
 * @property {number} optimisticTTI
 * @property {number} optimisticLCP
 * @property {number} pessimisticFCP
 * @property {number} pessimisticFMP
 * @property {number} pessimisticSI
 * @property {number} pessimisticTTFCPUI
 * @property {number} pessimisticTTI
 * @property {number} pessimisticLCP
 * @property {number} roughEstimateOfFCP
 * @property {number} roughEstimateOfFMP
 * @property {number} roughEstimateOfSI
 * @property {number} roughEstimateOfTTFCPUI
 * @property {number} roughEstimateOfTTI
 * @property {number} roughEstimateOfLCP
 */

/** @type {Array<string>} */
const WARNINGS = [];

module.exports = {
  WARNINGS,
  // prettier-ignore
  SITE_INDEX_WITH_GOLDEN_PATH: './lantern-data/site-index-plus-golden-expectations.json',
  // prettier-ignore
  SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH: path.join(__dirname, '../../../.tmp/site-index-plus-golden-expectations-plus-computed.json'),
  // prettier-ignore
  MASTER_COMPUTED_PATH: path.join(__dirname, '../../test/fixtures/lantern-master-computed-values.json'),
  // prettier-ignore
  MASTER_ACCURACY_PATH: path.join(__dirname, '../../test/fixtures/lantern-master-accuracy.json'),
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
    const expected = Math.round(expectedMetrics[metric]);
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
   * @param {'lantern'|'baseline'} [lanternOrBaseline]
   * @return {EstimateEvaluationSummary}
   */
  evaluateAccuracy(entries, metric, lanternMetric, lanternOrBaseline = 'lantern') {
    const evaluations = [];

    const percentErrors = [];
    for (const entry of entries) {
      const evaluation = this.evaluateSite(
        entry,
        entry.wpt3g,
        entry[lanternOrBaseline],
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
      roughEstimateOfFMP: evaluate('firstMeaningfulPaint', 'roughEstimateOfFMP'),
      roughEstimateOfSI: evaluate('speedIndex', 'roughEstimateOfSI'),
      roughEstimateOfTTFCPUI: evaluate('timeToFirstInteractive', 'roughEstimateOfTTFCPUI'),
      roughEstimateOfTTI: evaluate('timeToConsistentlyInteractive', 'roughEstimateOfTTI'),
      roughEstimateOfLCP: evaluate('largestContentfulPaint', 'roughEstimateOfLCP'),
    };
  },
};
