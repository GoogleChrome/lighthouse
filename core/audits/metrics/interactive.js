/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {Interactive} from '../../computed/metrics/interactive.js';

const UIStrings = {
  /** Description of the Time to Interactive (TTI) metric, which evaluates when a page has completed its primary network activity and main thread work. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Time to Interactive is the amount of time it takes for the page to become fully ' +
    'interactive. [Learn more about the Time to Interactive metric](https://developer.chrome.com/docs/lighthouse/performance/interactive/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @fileoverview This audit identifies the time the page is "consistently interactive".
 * Looks for the first period of at least 5 seconds after FCP where both CPU and network were quiet,
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
    const trace = artifacts.Trace;
    const devtoolsLog = artifacts.DevtoolsLog;
    const gatherContext = artifacts.GatherContext;
    const metricComputationData = {
      trace, devtoolsLog, gatherContext,
      settings: context.settings, URL: artifacts.URL,
      SourceMaps: artifacts.SourceMaps, simulator: null,
    };
    const metricResult = await Interactive.request(metricComputationData, context);
    const timeInMs = metricResult.timing;
    const options = context.options[context.settings.formFactor];


    return {
      score: Audit.computeLogNormalScore(
        options.scoring,
        timeInMs
      ),
      numericValue: timeInMs,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs}),
    };
  }
}

export default InteractiveMetric;
export {UIStrings};
