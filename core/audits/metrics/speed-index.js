/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {SpeedIndex as ComputedSi} from '../../computed/metrics/speed-index.js';

const UIStrings = {
  /** Description of the Speed Index metric, which summarizes how quickly the page looked visually complete. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Speed Index shows how quickly the contents of a page are visibly populated. ' +
      '[Learn more about the Speed Index metric](https://developer.chrome.com/docs/lighthouse/performance/speed-index/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class SpeedIndex extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'speed-index',
      title: str_(i18n.UIStrings.speedIndexMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['navigation'],
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'GatherContext', 'URL', 'SourceMaps'],
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
        // see https://www.desmos.com/calculator/dvuzvpl7mi
        scoring: {
          p10: 3387,
          median: 5800,
        },
      },
      desktop: {
        // SELECT QUANTILES(SpeedIndex, 21) FROM [httparchive:summary_pages.2018_12_15_desktop] LIMIT 1000
        scoring: {
          p10: 1311,
          median: 2300,
        },
      },
    };
  }

  /**
   * Audits the page to give a score for the Speed Index.
   * @see https://github.com/GoogleChrome/lighthouse/issues/197
   * @param {LH.Artifacts} artifacts The artifacts from the gather phase.
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.Trace;
    const devtoolsLog = artifacts.DevtoolsLog;
    const gatherContext = artifacts.GatherContext;
    const metricComputationData = {
      trace, devtoolsLog, gatherContext,
      settings: context.settings, URL: artifacts.URL,
      SourceMaps: artifacts.SourceMaps, simulator: null,
    };
    const metricResult = await ComputedSi.request(metricComputationData, context);
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

export default SpeedIndex;
export {UIStrings};
