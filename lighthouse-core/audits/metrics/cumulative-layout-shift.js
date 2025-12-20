/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const ComputedCLS = require('../../computed/metrics/cumulative-layout-shift.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Description of the Cumulative Layout Shift metric that indicates how much the page changes its layout while it loads. If big segments of the page shift their location during load, the Cumulative Layout Shift will be higher. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Cumulative Layout Shift measures the movement of visible ' +
               'elements within the viewport. [Learn more](https://web.dev/cls).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview This metric represents the amount of visual shifting of DOM elements during page load.
 */
class CumulativeLayoutShift extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'cumulative-layout-shift',
      title: str_(i18n.UIStrings.cumulativeLayoutShiftMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // https://web.dev/cls/#what-is-a-good-cls-score
      // This 0.1 target score was determined through both manual evaluation and large-scale analysis.
      // see https://www.desmos.com/calculator/ksp7q91nop
      p10: 0.1,
      median: 0.25,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const metricResult = await ComputedCLS.request(trace, context);

    /** @type {LH.Audit.Details.DebugData} */
    const details = {
      type: 'debugdata',
      items: [metricResult.debugInfo],
    };

    return {
      score: Audit.computeLogNormalScore(
        {p10: context.options.p10, median: context.options.median},
        metricResult.value
      ),
      numericValue: metricResult.value,
      numericUnit: 'unitless',
      displayValue: metricResult.value.toLocaleString(context.settings.locale),
      details,
    };
  }
}

module.exports = CumulativeLayoutShift;
module.exports.UIStrings = UIStrings;
