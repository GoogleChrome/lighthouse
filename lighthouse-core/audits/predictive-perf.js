/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const I18n = require('../report/html/renderer/i18n.js');

const LanternFcp = require('../computed/metrics/lantern-first-contentful-paint.js');
const LanternFmp = require('../computed/metrics/lantern-first-meaningful-paint.js');
const LanternInteractive = require('../computed/metrics/lantern-interactive.js');
const LanternFirstCPUIdle = require('../computed/metrics/lantern-first-cpu-idle.js');
const LanternSpeedIndex = require('../computed/metrics/lantern-speed-index.js');
const LanternEil = require('../computed/metrics/lantern-estimated-input-latency.js');
const LanternLcp = require('../computed/metrics/lantern-largest-contentful-paint.js');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/bksgkihhj8
const SCORING_P10 = 3651;
const SCORING_MEDIAN = 10000;

class PredictivePerf extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'predictive-perf',
      title: 'Predicted Performance (beta)',
      description:
        'Predicted performance evaluates how your site will perform under ' +
        'a cellular connection on a mobile device.',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
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
    /** @type {LH.Config.Settings} */
    // @ts-ignore - TODO(bckenny): allow optional `throttling` settings
    const settings = {}; // Use default settings.
    const fcp = await LanternFcp.request({trace, devtoolsLog, settings}, context);
    const fmp = await LanternFmp.request({trace, devtoolsLog, settings}, context);
    const tti = await LanternInteractive.request({trace, devtoolsLog, settings}, context);
    const ttfcpui = await LanternFirstCPUIdle.request({trace, devtoolsLog, settings}, context);
    const si = await LanternSpeedIndex.request({trace, devtoolsLog, settings}, context);
    const eil = await LanternEil.request({trace, devtoolsLog, settings}, context);
    const lcp = await LanternLcp.request({trace, devtoolsLog, settings}, context);

    const values = {
      roughEstimateOfFCP: fcp.timing,
      optimisticFCP: fcp.optimisticEstimate.timeInMs,
      pessimisticFCP: fcp.pessimisticEstimate.timeInMs,

      roughEstimateOfFMP: fmp.timing,
      optimisticFMP: fmp.optimisticEstimate.timeInMs,
      pessimisticFMP: fmp.pessimisticEstimate.timeInMs,

      roughEstimateOfTTI: tti.timing,
      optimisticTTI: tti.optimisticEstimate.timeInMs,
      pessimisticTTI: tti.pessimisticEstimate.timeInMs,

      roughEstimateOfTTFCPUI: ttfcpui.timing,
      optimisticTTFCPUI: ttfcpui.optimisticEstimate.timeInMs,
      pessimisticTTFCPUI: ttfcpui.pessimisticEstimate.timeInMs,

      roughEstimateOfSI: si.timing,
      optimisticSI: si.optimisticEstimate.timeInMs,
      pessimisticSI: si.pessimisticEstimate.timeInMs,

      roughEstimateOfEIL: eil.timing,
      optimisticEIL: eil.optimisticEstimate.timeInMs,
      pessimisticEIL: eil.pessimisticEstimate.timeInMs,

      roughEstimateOfLCP: lcp.timing,
      optimisticLCP: lcp.optimisticEstimate.timeInMs,
      pessimisticLCP: lcp.pessimisticEstimate.timeInMs,
    };

    const score = Audit.computeLogNormalScore(
      {p10: SCORING_P10, median: SCORING_MEDIAN},
      values.roughEstimateOfTTI
    );

    const i18n = new I18n(context.settings.locale);

    return {
      score,
      numericValue: values.roughEstimateOfTTI,
      numericUnit: 'millisecond',
      displayValue: i18n.formatMilliseconds(values.roughEstimateOfTTI),
      details: {
        type: 'debugdata',
        // TODO: Consider not nesting values under `items`.
        items: [values],
      },
    };
  }
}

module.exports = PredictivePerf;
