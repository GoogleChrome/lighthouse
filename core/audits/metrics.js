/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {TimingSummary} from '../computed/metrics/timing-summary.js';

/** @type {Set<keyof LH.Artifacts.TimingSummary>} */
const DECIMAL_METRIC_KEYS = new Set([
  'cumulativeLayoutShift',
  'cumulativeLayoutShiftMainFrame',
  'observedCumulativeLayoutShift',
  'observedCumulativeLayoutShiftMainFrame',
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
      supportedModes: ['navigation'],
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'GatherContext', 'URL', 'SourceMaps'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings;
    const gatherContext = artifacts.GatherContext;
    const trace = artifacts.Trace;
    const devtoolsLog = artifacts.DevtoolsLog;
    const {URL, SourceMaps} = artifacts;
    const summary = await TimingSummary
      .request({trace, devtoolsLog, gatherContext, settings, URL, SourceMaps}, context);
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

export default Metrics;
