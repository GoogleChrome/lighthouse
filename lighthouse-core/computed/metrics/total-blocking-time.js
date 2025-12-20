/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const ComputedMetric = require('./metric.js');
const LHError = require('../../lib/lh-error.js');
const TracingProcessor = require('../../lib/tracehouse/trace-processor.js');
const LanternTotalBlockingTime = require('./lantern-total-blocking-time.js');
const TimetoInteractive = require('./interactive.js');

/**
 * @fileoverview This audit determines Total Blocking Time.

 * We define Blocking Time as any time interval in the loading timeline where task length exceeds
 * 50ms. For example, if there is a 110ms main thread task, the last 60ms of it is blocking time.
 * Total Blocking Time is the sum of all Blocking Time between First Contentful Paint and
 * Interactive Time (TTI).
 *
 * This is a new metric designed to accompany Time to Interactive. TTI is strict and does not
 * reflect incremental improvements to the site performance unless the improvement concerns the last
 * long task. Total Blocking Time on the other hand is designed to be much more responsive
 * to smaller improvements to main thread responsiveness.
 */
class TotalBlockingTime extends ComputedMetric {
  /**
   * @return {number}
   */
  static get BLOCKING_TIME_THRESHOLD() {
    return 50;
  }
  /**
   * @param {Array<{start: number, end: number, duration: number}>} topLevelEvents
   * @param {number} fcpTimeInMs
   * @param {number} interactiveTimeMs
   * @return {number}
   */
  static calculateSumOfBlockingTime(topLevelEvents, fcpTimeInMs, interactiveTimeMs) {
    if (interactiveTimeMs <= fcpTimeInMs) return 0;

    const threshold = TotalBlockingTime.BLOCKING_TIME_THRESHOLD;
    let sumBlockingTime = 0;
    for (const event of topLevelEvents) {
      // Early exit for small tasks, which should far outnumber long tasks.
      if (event.duration < threshold) continue;

      // We only want to consider tasks that fall between FCP and TTI.
      // FCP is picked as the lower bound because there is little risk of user input happening
      // before FCP so Long Queuing Qelay regions do not harm user experience. Developers should be
      // optimizing to reach FCP as fast as possible without having to worry about task lengths.
      if (event.end < fcpTimeInMs) continue;

      // TTI is picked as the upper bound because we want a well defined end point so that the
      // metric does not rely on how long we trace.
      if (event.start > interactiveTimeMs) continue;

      // We first perform the clipping, and then calculate Blocking Region. So if we have a 150ms
      // task [0, 150] and FCP happens midway at 50ms, we first clip the task to [50, 150], and then
      // calculate the Blocking Region to be [100, 150]. The rational here is that tasks before FCP
      // are unimportant, so we care whether the main thread is busy more than 50ms at a time only
      // after FCP.
      const clippedStart = Math.max(event.start, fcpTimeInMs);
      const clippedEnd = Math.min(event.end, interactiveTimeMs);
      const clippedDuration = clippedEnd - clippedStart;
      if (clippedDuration < threshold) continue;

      // The duration of the task beyond 50ms at the beginning is considered the Blocking Region.
      // Example:
      //   [              250ms Task                   ]
      //   | First 50ms |   Blocking Region (200ms)    |
      sumBlockingTime += (clippedDuration - threshold);
    }

    return sumBlockingTime;
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    return LanternTotalBlockingTime.request(data, context);
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data, context) {
    const {firstContentfulPaint} = data.traceOfTab.timings;
    if (!firstContentfulPaint) {
      throw new LHError(LHError.errors.NO_FCP);
    }

    const interactiveTimeMs = (await TimetoInteractive.request(data, context)).timing;

    const events = TracingProcessor.getMainThreadTopLevelEvents(data.traceOfTab);

    return {
      timing: TotalBlockingTime.calculateSumOfBlockingTime(
        events,
        firstContentfulPaint,
        interactiveTimeMs
      ),
    };
  }
}

module.exports = makeComputedArtifact(TotalBlockingTime);
