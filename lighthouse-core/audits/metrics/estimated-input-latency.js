/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');
const ComputedEil = require('../../computed/metrics/estimated-input-latency.js');

const UIStrings = {
  /** Description of the Estimated Input Latency metric that estimates the amount of time, in milliseconds, that the app takes to respond to user input. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Estimated Input Latency is an estimate of how long your app takes to respond to ' +
      'user input, in milliseconds, during the busiest 5s window of page load. If your ' +
      'latency is higher than 50 ms, users may perceive your app as laggy. ' +
      '[Learn more](https://web.dev/estimated-input-latency).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class EstimatedInputLatency extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'estimated-input-latency',
      title: str_(i18n.UIStrings.estimatedInputLatencyMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/mgd0hjqnal
      p10: 58,
      median: 100,
    };
  }

  /**
   * Audits the page to estimate input latency.
   * @see https://github.com/GoogleChrome/lighthouse/issues/28
   *
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await ComputedEil.request(metricComputationData, context);

    return {
      score: Audit.computeLogNormalScore(
        {p10: context.options.p10, median: context.options.median},
        metricResult.timing
      ),
      numericValue: metricResult.timing,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.ms, {timeInMs: metricResult.timing}),
    };
  }
}

module.exports = EstimatedInputLatency;
module.exports.UIStrings = UIStrings;
