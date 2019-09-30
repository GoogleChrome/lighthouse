/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');
const TraceOfTab = require('../computed/trace-of-tab.js');
const Speedline = require('../computed/speedline.js');
const FirstContentfulPaint = require('../computed/metrics/first-contentful-paint.js');
const FirstMeaningfulPaint = require('../computed/metrics/first-meaningful-paint.js');
const FirstCPUIdle = require('../computed/metrics/first-cpu-idle.js');
const Interactive = require('../computed/metrics/interactive.js');
const SpeedIndex = require('../computed/metrics/speed-index.js');
const EstimatedInputLatency = require('../computed/metrics/estimated-input-latency.js');
const TotalBlockingTime = require('../computed/metrics/total-blocking-time.js');

const UIStrings = {
  /**
   * @description Warning that the page wasn't visible during the entire Lighthouse run. Metrics may be inaccurate.
   */
  warningVisibility: 'Window was hidden for part of all of the audit. Metrics may be inaccurate.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      requiredArtifacts: ['traces', 'devtoolsLogs', 'Visibility'],
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

    /**
     * @template TArtifacts
     * @template TReturn
     * @param {{request: (artifact: TArtifacts, context: LH.Audit.Context) => Promise<TReturn>}} Artifact
     * @param {TArtifacts} artifact
     * @return {Promise<TReturn|undefined>}
     */
    const requestOrUndefined = (Artifact, artifact) => {
      return Artifact.request(artifact, context).catch(_ => undefined);
    };

    const traceOfTab = await TraceOfTab.request(trace, context);
    const speedline = await Speedline.request(trace, context);
    const firstContentfulPaint = await FirstContentfulPaint.request(metricComputationData, context);
    const firstMeaningfulPaint = await FirstMeaningfulPaint.request(metricComputationData, context);
    const firstCPUIdle = await requestOrUndefined(FirstCPUIdle, metricComputationData);
    const interactive = await requestOrUndefined(Interactive, metricComputationData);
    const speedIndex = await requestOrUndefined(SpeedIndex, metricComputationData);
    const estimatedInputLatency = await EstimatedInputLatency.request(metricComputationData, context); // eslint-disable-line max-len
    const totalBlockingTime = await TotalBlockingTime.request(metricComputationData, context); // eslint-disable-line max-len

    /** @type {UberMetricsItem} */
    const metrics = {
      // Include the simulated/observed performance metrics
      firstContentfulPaint: firstContentfulPaint.timing,
      firstContentfulPaintTs: firstContentfulPaint.timestamp,
      firstMeaningfulPaint: firstMeaningfulPaint.timing,
      firstMeaningfulPaintTs: firstMeaningfulPaint.timestamp,
      firstCPUIdle: firstCPUIdle && firstCPUIdle.timing,
      firstCPUIdleTs: firstCPUIdle && firstCPUIdle.timestamp,
      interactive: interactive && interactive.timing,
      interactiveTs: interactive && interactive.timestamp,
      speedIndex: speedIndex && speedIndex.timing,
      speedIndexTs: speedIndex && speedIndex.timestamp,
      estimatedInputLatency: estimatedInputLatency.timing,
      estimatedInputLatencyTs: estimatedInputLatency.timestamp,
      totalBlockingTime: totalBlockingTime.timing,

      // Include all timestamps of interest from trace of tab
      observedNavigationStart: traceOfTab.timings.navigationStart,
      observedNavigationStartTs: traceOfTab.timestamps.navigationStart,
      observedFirstPaint: traceOfTab.timings.firstPaint,
      observedFirstPaintTs: traceOfTab.timestamps.firstPaint,
      observedFirstContentfulPaint: traceOfTab.timings.firstContentfulPaint,
      observedFirstContentfulPaintTs: traceOfTab.timestamps.firstContentfulPaint,
      observedFirstMeaningfulPaint: traceOfTab.timings.firstMeaningfulPaint,
      observedFirstMeaningfulPaintTs: traceOfTab.timestamps.firstMeaningfulPaint,
      observedTraceEnd: traceOfTab.timings.traceEnd,
      observedTraceEndTs: traceOfTab.timestamps.traceEnd,
      observedLoad: traceOfTab.timings.load,
      observedLoadTs: traceOfTab.timestamps.load,
      observedDomContentLoaded: traceOfTab.timings.domContentLoaded,
      observedDomContentLoadedTs: traceOfTab.timestamps.domContentLoaded,

      // Include some visual metrics from speedline
      observedFirstVisualChange: speedline.first,
      observedFirstVisualChangeTs: (speedline.first + speedline.beginning) * 1000,
      observedLastVisualChange: speedline.complete,
      observedLastVisualChangeTs: (speedline.complete + speedline.beginning) * 1000,
      observedSpeedIndex: speedline.speedIndex,
      observedSpeedIndexTs: (speedline.speedIndex + speedline.beginning) * 1000,
    };

    for (const [name, value] of Object.entries(metrics)) {
      const key = /** @type {keyof UberMetricsItem} */ (name);
      if (typeof value !== 'undefined') {
        metrics[key] = Math.round(value);
      }
    }

    /** @type {LH.Audit.Details.DebugData} */
    const details = {
      type: 'debugdata',
      // TODO: Consider not nesting metrics under `items`.
      items: [metrics],
    };

    if (artifacts.Visibility.some(event => event.state === 'hidden')) {
      context.LighthouseRunWarnings.push(str_(UIStrings.warningVisibility));
    }

    return {
      score: 1,
      numericValue: (interactive && interactive.timing) || 0,
      details,
    };
  }
}

/**
 * @typedef UberMetricsItem
 * @property {number} firstContentfulPaint
 * @property {number=} firstContentfulPaintTs
 * @property {number} firstMeaningfulPaint
 * @property {number=} firstMeaningfulPaintTs
 * @property {number=} firstCPUIdle
 * @property {number=} firstCPUIdleTs
 * @property {number=} interactive
 * @property {number=} interactiveTs
 * @property {number=} speedIndex
 * @property {number=} speedIndexTs
 * @property {number} estimatedInputLatency
 * @property {number=} estimatedInputLatencyTs
 * @property {number} totalBlockingTime
 * @property {number} observedNavigationStart
 * @property {number} observedNavigationStartTs
 * @property {number=} observedFirstPaint
 * @property {number=} observedFirstPaintTs
 * @property {number} observedFirstContentfulPaint
 * @property {number} observedFirstContentfulPaintTs
 * @property {number=} observedFirstMeaningfulPaint
 * @property {number=} observedFirstMeaningfulPaintTs
 * @property {number=} observedTraceEnd
 * @property {number=} observedTraceEndTs
 * @property {number=} observedLoad
 * @property {number=} observedLoadTs
 * @property {number=} observedDomContentLoaded
 * @property {number=} observedDomContentLoadedTs
 * @property {number} observedFirstVisualChange
 * @property {number} observedFirstVisualChangeTs
 * @property {number} observedLastVisualChange
 * @property {number} observedLastVisualChangeTs
 * @property {number} observedSpeedIndex
 * @property {number} observedSpeedIndexTs
 */

module.exports = Metrics;
module.exports.UIStrings = UIStrings;
