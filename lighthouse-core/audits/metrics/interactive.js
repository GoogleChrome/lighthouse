/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');
const Interactive = require('../../computed/metrics/interactive.js');

const UIStrings = {
  /** Description of the Time to Interactive (TTI) metric, which evaluates when a page has completed its primary network activity and main thread work. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Time to interactive is the amount of time it takes for the page to become fully ' +
    'interactive. [Learn more](https://web.dev/interactive).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview This audit identifies the time the page is "consistently interactive".
 * Looks for the first period of at least 5 seconds after FMP where both CPU and network were quiet,
 * and returns the timestamp of the beginning of the CPU quiet period.
 * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
 */
class InteractiveMetric extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'interactive',
      title: str_(i18n.UIStrings.interactiveMetric),
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
        // 25th and 5th percentiles HTTPArchive -> median and PODR, then p10 derived from them.
        // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
        // see https://www.desmos.com/calculator/o98tbeyt1t
        scoring: {
          p10: 3785,
          median: 7300,
        },
      },
      desktop: {
        // SELECT QUANTILES(fullyLoaded, 21) FROM [httparchive:summary_pages.2018_12_15_desktop] LIMIT 1000
        scoring: {
          p10: 2468,
          median: 4500,
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
    const metricResult = await Interactive.request(metricComputationData, context);
    const timeInMs = metricResult.timing;
    const isDesktop = artifacts.TestedAsMobileDevice === false;
    const options = isDesktop ? context.options.desktop : context.options.mobile;
    const extendedInfo = {
      timeInMs,
      timestamp: metricResult.timestamp,
      // @ts-ignore - TODO(bckenny): make lantern metric/metric a discriminated union.
      optimistic: metricResult.optimisticEstimate && metricResult.optimisticEstimate.timeInMs,
      // @ts-ignore
      pessimistic: metricResult.pessimisticEstimate && metricResult.pessimisticEstimate.timeInMs,
    };

    return {
      score: Audit.computeLogNormalScore(
        options.scoring,
        timeInMs
      ),
      numericValue: timeInMs,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs}),
      extendedInfo: {
        value: extendedInfo,
      },
    };
  }
}

module.exports = InteractiveMetric;
module.exports.UIStrings = UIStrings;
