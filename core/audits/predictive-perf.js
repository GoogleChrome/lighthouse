/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {LanternFirstContentfulPaint} from '../computed/metrics/lantern-first-contentful-paint.js';
import {LanternInteractive} from '../computed/metrics/lantern-interactive.js';
import {LanternSpeedIndex} from '../computed/metrics/lantern-speed-index.js';
import {LanternLargestContentfulPaint} from '../computed/metrics/lantern-largest-contentful-paint.js';
import {TimingSummary} from '../computed/metrics/timing-summary.js';
import {defaultSettings} from '../config/constants.js';

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/bksgkihhj8
const SCORING_P10 = 3651;
const SCORING_MEDIAN = 10000;

const str_ = i18n.createIcuMessageFn(import.meta.url, {});

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
      supportedModes: ['navigation'],
      requiredArtifacts: ['traces', 'devtoolsLogs', 'GatherContext', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const gatherContext = artifacts.GatherContext;
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;
    /** @type {LH.Config.Settings} */
    const settings = JSON.parse(JSON.stringify(defaultSettings)); // Use default settings.
    const computationData = {trace, devtoolsLog, gatherContext, settings, URL};
    const fcp = await LanternFirstContentfulPaint.request(computationData, context);
    const tti = await LanternInteractive.request(computationData, context);
    const si = await LanternSpeedIndex.request(computationData, context);
    const lcp = await LanternLargestContentfulPaint.request(computationData, context);

    const timingSummary = await TimingSummary.request(computationData, context);

    const values = {
      roughEstimateOfFCP: fcp.timing,
      optimisticFCP: fcp.optimisticEstimate.timeInMs,
      pessimisticFCP: fcp.pessimisticEstimate.timeInMs,

      roughEstimateOfTTI: tti.timing,
      optimisticTTI: tti.optimisticEstimate.timeInMs,
      pessimisticTTI: tti.pessimisticEstimate.timeInMs,

      roughEstimateOfSI: si.timing,
      optimisticSI: si.optimisticEstimate.timeInMs,
      pessimisticSI: si.pessimisticEstimate.timeInMs,

      roughEstimateOfLCP: lcp.timing,
      optimisticLCP: lcp.optimisticEstimate.timeInMs,
      pessimisticLCP: lcp.pessimisticEstimate.timeInMs,

      roughEstimateOfTTFB: timingSummary.metrics.timeToFirstByte,
      roughEstimateOfLCPLoadStart: timingSummary.metrics.lcpLoadStart,
      roughEstimateOfLCPLoadEnd: timingSummary.metrics.lcpLoadEnd,
    };

    const score = Audit.computeLogNormalScore(
      {p10: SCORING_P10, median: SCORING_MEDIAN},
      values.roughEstimateOfTTI
    );

    return {
      score,
      numericValue: values.roughEstimateOfTTI,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.ms, {timeInMs: values.roughEstimateOfTTI}),
      details: {
        type: 'debugdata',
        // TODO: Consider not nesting values under `items`.
        items: [values],
      },
    };
  }
}

export default PredictivePerf;
