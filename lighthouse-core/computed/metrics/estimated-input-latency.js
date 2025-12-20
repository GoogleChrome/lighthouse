/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const ComputedMetric = require('./metric.js');
const LHError = require('../../lib/lh-error.js');
const TracingProcessor = require('../../lib/tracehouse/trace-processor.js');
const LanternEstimatedInputLatency = require('./lantern-estimated-input-latency.js');

const ROLLING_WINDOW_SIZE = 5000;

/**
 * @fileoverview This audit determines the largest 90 percentile EQT value of all 5s windows between
 *    FMP and the end of the trace.
 * @see https://docs.google.com/document/d/1b9slyaB9yho91YTOkAQfpCdULFkZM9LqsipcX3t7He8/preview
 */
class EstimatedInputLatency extends ComputedMetric {
  /**
   * @param {Array<{start: number, end: number, duration: number}>} events
   * @return {number}
   */
  static calculateRollingWindowEIL(events) {
    const candidateStartEvts = events.filter(evt => evt.duration >= 10);

    let worst90thPercentileLatency = 16;
    for (const startEvt of candidateStartEvts) {
      const latencyPercentiles = TracingProcessor.getRiskToResponsiveness(
        events,
        startEvt.start,
        startEvt.start + ROLLING_WINDOW_SIZE,
        [0.9]
      );

      worst90thPercentileLatency = Math.max(latencyPercentiles[0].time, worst90thPercentileLatency);
    }

    return worst90thPercentileLatency;
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    return LanternEstimatedInputLatency.request(data, context);
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data) {
    const {firstMeaningfulPaint} = data.traceOfTab.timings;
    if (!firstMeaningfulPaint) {
      throw new LHError(LHError.errors.NO_FMP);
    }

    const events = TracingProcessor.getMainThreadTopLevelEvents(
      data.traceOfTab,
      firstMeaningfulPaint
    ).filter(evt => evt.duration >= 1);

    return Promise.resolve({
      timing: EstimatedInputLatency.calculateRollingWindowEIL(events),
    });
  }
}

module.exports = makeComputedArtifact(EstimatedInputLatency);
