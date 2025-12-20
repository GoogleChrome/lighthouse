/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const ComputedFid = require('../../computed/metrics/max-potential-fid.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Description of the Maximum Potential First Input Delay metric that marks the maximum estimated time between the page receiving input (a user clicking, tapping, or typing) and the page responding. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'The maximum potential First Input Delay that your users could experience is the ' +
      'duration of the longest task. [Learn more](https://web.dev/lighthouse-max-potential-fid).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview This metric is the duration of the longest task after FCP. It is meant to capture
 * the worst case First Input Delay that a user might experience.
 * Tasks before FCP are excluded because it is unlikely that the user will try to interact with a page before it has painted anything.
 */
class MaxPotentialFID extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'max-potential-fid',
      title: str_(i18n.UIStrings.maxPotentialFIDMetric),
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
      // see https://www.desmos.com/calculator/onxmbblyqo
      p10: 130,
      median: 250,
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
    const metricResult = await ComputedFid.request(metricComputationData, context);

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

module.exports = MaxPotentialFID;
module.exports.UIStrings = UIStrings;
