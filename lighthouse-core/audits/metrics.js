/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const ComputedTimingSummary = require('../computed/metrics/timing-summary.js');

/** @type {Set<keyof LH.Artifacts.TimingSummary>} */
const DECIMAL_METRIC_KEYS = new Set([
  'cumulativeLayoutShift',
  'observedCumulativeLayoutShift',
]);

class Metrics extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'metrics',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Metrics',
      description: 'Collects all available metrics.',
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
    const summary = await ComputedTimingSummary
      .request({trace, devtoolsLog}, context);
    const metrics = summary.metrics;
    const debugInfo = summary.debugInfo;

    for (const [name, value] of Object.entries(metrics)) {
      const key = /** @type {keyof LH.Artifacts.TimingSummary} */ (name);
      if (typeof value === 'number' && !DECIMAL_METRIC_KEYS.has(key)) {
        metrics[key] = Math.round(value);
      }
    }

    /** @type {LH.Audit.Details.DebugData} */
    const details = {
      type: 'debugdata',
      // TODO: Consider not nesting metrics under `items`.
      items: [metrics, debugInfo],
    };

    return {
      score: 1,
      numericValue: metrics.interactive || 0,
      numericUnit: 'millisecond',
      details,
    };
  }
}

module.exports = Metrics;
