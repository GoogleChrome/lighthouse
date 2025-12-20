/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TraceOfTab = require('../trace-of-tab.js');
const Speedline = require('../speedline.js');
const FirstContentfulPaint = require('./first-contentful-paint.js');
const FirstMeaningfulPaint = require('./first-meaningful-paint.js');
const LargestContentfulPaint = require('./largest-contentful-paint.js');
const FirstCPUIdle = require('./first-cpu-idle.js');
const Interactive = require('./interactive.js');
const CumulativeLayoutShift = require('./cumulative-layout-shift.js');
const SpeedIndex = require('./speed-index.js');
const EstimatedInputLatency = require('./estimated-input-latency.js');
const MaxPotentialFID = require('./max-potential-fid.js');
const TotalBlockingTime = require('./total-blocking-time.js');
const makeComputedArtifact = require('../computed-artifact.js');

class TimingSummary {
  /**
     * @param {LH.Trace} trace
     * @param {LH.DevtoolsLog} devtoolsLog
     * @param {LH.Audit.Context} context
     * @return {Promise<{metrics: LH.Artifacts.TimingSummary, debugInfo: Record<string,boolean>}>}
     */
  static async summarize(trace, devtoolsLog, context) {
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
    const largestContentfulPaint = await requestOrUndefined(LargestContentfulPaint, metricComputationData); // eslint-disable-line max-len
    const firstCPUIdle = await requestOrUndefined(FirstCPUIdle, metricComputationData);
    const interactive = await requestOrUndefined(Interactive, metricComputationData);
    const cumulativeLayoutShift = await requestOrUndefined(CumulativeLayoutShift, trace);
    const maxPotentialFID = await requestOrUndefined(MaxPotentialFID, metricComputationData);
    const speedIndex = await requestOrUndefined(SpeedIndex, metricComputationData);
    const estimatedInputLatency = await EstimatedInputLatency.request(metricComputationData, context); // eslint-disable-line max-len
    const totalBlockingTime = await TotalBlockingTime.request(metricComputationData, context); // eslint-disable-line max-len

    const cumulativeLayoutShiftValue = cumulativeLayoutShift &&
      cumulativeLayoutShift.value !== null ?
      cumulativeLayoutShift.value : undefined;

    /** @type {LH.Artifacts.TimingSummary} */
    const metrics = {
      // Include the simulated/observed performance metrics
      firstContentfulPaint: firstContentfulPaint.timing,
      firstContentfulPaintTs: firstContentfulPaint.timestamp,
      firstMeaningfulPaint: firstMeaningfulPaint.timing,
      firstMeaningfulPaintTs: firstMeaningfulPaint.timestamp,
      largestContentfulPaint: largestContentfulPaint && largestContentfulPaint.timing,
      largestContentfulPaintTs: largestContentfulPaint && largestContentfulPaint.timestamp,
      firstCPUIdle: firstCPUIdle && firstCPUIdle.timing,
      firstCPUIdleTs: firstCPUIdle && firstCPUIdle.timestamp,
      interactive: interactive && interactive.timing,
      interactiveTs: interactive && interactive.timestamp,
      speedIndex: speedIndex && speedIndex.timing,
      speedIndexTs: speedIndex && speedIndex.timestamp,
      estimatedInputLatency: estimatedInputLatency.timing,
      estimatedInputLatencyTs: estimatedInputLatency.timestamp,
      totalBlockingTime: totalBlockingTime.timing,
      maxPotentialFID: maxPotentialFID && maxPotentialFID.timing,
      cumulativeLayoutShift: cumulativeLayoutShiftValue,

      // Include all timestamps of interest from trace of tab
      observedNavigationStart: traceOfTab.timings.navigationStart,
      observedNavigationStartTs: traceOfTab.timestamps.navigationStart,
      observedFirstPaint: traceOfTab.timings.firstPaint,
      observedFirstPaintTs: traceOfTab.timestamps.firstPaint,
      observedFirstContentfulPaint: traceOfTab.timings.firstContentfulPaint,
      observedFirstContentfulPaintTs: traceOfTab.timestamps.firstContentfulPaint,
      observedFirstMeaningfulPaint: traceOfTab.timings.firstMeaningfulPaint,
      observedFirstMeaningfulPaintTs: traceOfTab.timestamps.firstMeaningfulPaint,
      observedLargestContentfulPaint: traceOfTab.timings.largestContentfulPaint,
      observedLargestContentfulPaintTs: traceOfTab.timestamps.largestContentfulPaint,
      observedTraceEnd: traceOfTab.timings.traceEnd,
      observedTraceEndTs: traceOfTab.timestamps.traceEnd,
      observedLoad: traceOfTab.timings.load,
      observedLoadTs: traceOfTab.timestamps.load,
      observedDomContentLoaded: traceOfTab.timings.domContentLoaded,
      observedDomContentLoadedTs: traceOfTab.timestamps.domContentLoaded,
      observedCumulativeLayoutShift: cumulativeLayoutShiftValue,

      // Include some visual metrics from speedline
      observedFirstVisualChange: speedline.first,
      observedFirstVisualChangeTs: (speedline.first + speedline.beginning) * 1000,
      observedLastVisualChange: speedline.complete,
      observedLastVisualChangeTs: (speedline.complete + speedline.beginning) * 1000,
      observedSpeedIndex: speedline.speedIndex,
      observedSpeedIndexTs: (speedline.speedIndex + speedline.beginning) * 1000,
    };
    /** @type {Record<string,boolean>} */
    const debugInfo = {lcpInvalidated: traceOfTab.lcpInvalidated};

    return {metrics, debugInfo};
  }
  /**
   * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Audit.Context} context
   * @return {Promise<{metrics: LH.Artifacts.TimingSummary, debugInfo: Record<string,boolean>}>}
   */
  static async compute_(data, context) {
    return TimingSummary.summarize(data.trace, data.devtoolsLog, context);
  }
}

module.exports = makeComputedArtifact(TimingSummary);
