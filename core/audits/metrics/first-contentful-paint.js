/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {FirstContentfulPaint as ComputedFcp} from '../../computed/metrics/first-contentful-paint.js';

const UIStrings = {
  /** Description of the First Contentful Paint (FCP) metric, which marks the time at which the first text or image is painted by the browser. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'First Contentful Paint marks the time at which the first text or image is ' +
      'painted. [Learn more about the First Contentful Paint metric](https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class FirstContentfulPaint extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'first-contentful-paint',
      title: str_(i18n.UIStrings.firstContentfulPaintMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['navigation'],
      requiredArtifacts: ['traces', 'devtoolsLogs', 'GatherContext', 'URL'],
    };
  }

  /**
   * @return {{mobile: {scoring: LH.Audit.ScoreOptions}, desktop: {scoring: LH.Audit.ScoreOptions}}}
   */
  static get defaultOptions() {
    return {
      mobile: {
        // 25th and 8th percentiles HTTPArchive -> median and p10.
        // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2021_05_01_mobile
        // see https://www.desmos.com/calculator/6wi8rhipve
        scoring: {
          p10: 1800,
          median: 3000,
        },
      },
      desktop: {
        // SELECT QUANTILES(renderStart, 21) FROM [httparchive:summary_pages.2020_07_01_desktop] LIMIT 1000
        scoring: {
          p10: 934,
          median: 1600,
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
    const metricResult = await ComputedFcp.request(metricComputationData, context);
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

export default FirstContentfulPaint;
export {UIStrings};
