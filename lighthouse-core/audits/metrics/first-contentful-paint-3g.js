/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const regular3G = require('../../config/constants.js').throttling.mobileRegluar3G;
const ComputedFcp = require('../../computed/metrics/first-contentful-paint.js');

class FirstContentfulPaint3G extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'first-contentful-paint-3g',
      title: 'First Contentful Paint (3G)',
      description: 'First Contentful Paint 3G marks the time at which the first text or image is ' +
        `painted while on a 3G network. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-contentful-paint).`,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // 25th and 5th percentiles HTTPArchive on Fast 3G -> multiply by 1.5 for RTT differential -> median and PODR
      // p10 is then derived from them.
      // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
      // https://www.desmos.com/calculator/fflcrsn9sj
      p10: 3504,
      median: 6000,
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
    /** @type {Immutable<LH.Config.Settings>} */
    const settings = {...context.settings, throttlingMethod: 'simulate', throttling: regular3G};
    const metricComputationData = {trace, devtoolsLog, settings};
    const metricResult = await ComputedFcp.request(metricComputationData, context);

    return {
      score: Audit.computeLogNormalScore(
        {p10: context.options.p10, median: context.options.median},
        metricResult.timing
      ),
      numericValue: metricResult.timing,
      numericUnit: 'millisecond',
      displayValue: `${metricResult.timing}\xa0ms`,
    };
  }
}

module.exports = FirstContentfulPaint3G;
