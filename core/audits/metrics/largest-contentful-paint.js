/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {LargestContentfulPaint as ComputedLcp} from '../../computed/metrics/largest-contentful-paint.js';

const UIStrings = {
  /** Description of the Largest Contentful Paint (LCP) metric, which marks the time at which the largest text or image is painted by the browser. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Largest Contentful Paint marks the time at which the largest text or image is ' +
      `painted. [Learn more about the Largest Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint/)`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LargestContentfulPaint extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'largest-contentful-paint',
      title: str_(i18n.UIStrings.largestContentfulPaintMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['navigation'],
      requiredArtifacts: ['HostUserAgent', 'traces', 'devtoolsLogs', 'GatherContext', 'URL'],
    };
  }

  /**
   * @return {{mobile: {scoring: LH.Audit.ScoreOptions}, desktop: {scoring: LH.Audit.ScoreOptions}}}
   */
  static get defaultOptions() {
    return {
      mobile: {
        // 25th and 13th percentiles HTTPArchive -> median and p10 points.
        // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2020_02_01_mobile?pli=1
        // https://web.dev/articles/lcp#what_is_a_good_lcp_score
        // see https://www.desmos.com/calculator/1etesp32kt
        scoring: {
          p10: 2500,
          median: 4000,
        },
      },
      desktop: {
        // 25th and 5th percentiles HTTPArchive -> median and p10 points.
        // SELECT
        //   APPROX_QUANTILES(lcpValue, 100)[OFFSET(5)] AS p05_lcp,
        //   APPROX_QUANTILES(lcpValue, 100)[OFFSET(25)] AS p25_lcp
        // FROM (
        //   SELECT CAST(JSON_EXTRACT_SCALAR(payload, "$['_chromeUserTiming.LargestContentfulPaint']") AS NUMERIC) AS lcpValue
        //   FROM `httparchive.pages.2020_04_01_desktop`
        // )
        scoring: {
          p10: 1200,
          median: 2400,
        },
      },
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const gatherContext = artifacts.GatherContext;
    const metricComputationData = {trace, devtoolsLog, gatherContext,
      settings: context.settings, URL: artifacts.URL};

    const metricResult = await ComputedLcp.request(metricComputationData, context);
    const options = context.options[context.settings.formFactor];

    return {
      score: Audit.computeLogNormalScore(
        options.scoring,
        metricResult.timing
      ),
      scoringOptions: options.scoring,
      numericValue: metricResult.timing,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs: metricResult.timing}),
    };
  }
}

export default LargestContentfulPaint;
export {UIStrings};
