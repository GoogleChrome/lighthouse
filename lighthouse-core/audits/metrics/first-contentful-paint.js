/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');
const ComputedFcp = require('../../computed/metrics/first-contentful-paint.js');

const UIStrings = {
  /** Description of the First Contentful Paint (FCP) metric, which marks the time at which the first text or image is painted by the browser. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'First Contentful Paint marks the time at which the first text or image is ' +
      `painted. [Learn more](https://web.dev/first-contentful-paint).`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      requiredArtifacts: ['traces', 'devtoolsLogs', 'TestedAsMobileDevice'],
    };
  }

  /**
   * @return {{mobile: {scoring: LH.Audit.ScoreOptions}, desktop: {scoring: LH.Audit.ScoreOptions}}}
   */
  static get defaultOptions() {
    return {
      mobile: {
        // 25th and 5th percentiles HTTPArchive -> median and PODR, then p10 is derived from them.
        // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
        // see https://www.desmos.com/calculator/oqlvmezbze
        scoring: {
          p10: 2336,
          median: 4000,
        },
      },
      desktop: {
        // SELECT QUANTILES(renderStart, 21) FROM [httparchive:summary_pages.2018_12_15_desktop] LIMIT 1000
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
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await ComputedFcp.request(metricComputationData, context);
    const isDesktop = artifacts.TestedAsMobileDevice === false;
    const options = isDesktop ? context.options.desktop : context.options.mobile;

    return {
      score: Audit.computeLogNormalScore(
        options.scoring,
        metricResult.timing
      ),
      numericValue: metricResult.timing,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs: metricResult.timing}),
    };
  }
}

module.exports = FirstContentfulPaint;
module.exports.UIStrings = UIStrings;
