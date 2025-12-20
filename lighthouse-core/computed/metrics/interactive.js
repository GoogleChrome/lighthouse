/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const ComputedMetric = require('./metric.js');
const LanternInteractive = require('./lantern-interactive.js');

const NetworkRecorder = require('../../lib/network-recorder.js');
const TracingProcessor = require('../../lib/tracehouse/trace-processor.js');
const LHError = require('../../lib/lh-error.js');

const REQUIRED_QUIET_WINDOW = 5000;
const ALLOWED_CONCURRENT_REQUESTS = 2;

/**
 * @fileoverview Computes "Time To Interactive", the time at which the page has loaded critical
 * resources and is mostly idle.
 * @see https://docs.google.com/document/d/1yE4YWsusi5wVXrnwhR61j-QyjK9tzENIzfxrCjA1NAk/edit#heading=h.yozfsuqcgpc4
 */
class Interactive extends ComputedMetric {
  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests (2).
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {{timestamps: {traceEnd: number}}} traceOfTab
   * @return {Array<TimePeriod>}
   */
  static _findNetworkQuietPeriods(networkRecords, traceOfTab) {
    const traceEndTsInMs = traceOfTab.timestamps.traceEnd / 1000;
    // Ignore records that failed, never finished, or were POST/PUT/etc.
    const filteredNetworkRecords = networkRecords.filter(record => {
      return record.finished && record.requestMethod === 'GET' && !record.failed &&
          // Consider network records that had 4xx/5xx status code as "failed"
          record.statusCode < 400;
    });
    return NetworkRecorder.findNetworkQuietPeriods(filteredNetworkRecords,
      ALLOWED_CONCURRENT_REQUESTS, traceEndTsInMs);
  }

  /**
   * Finds all time periods where there are no long tasks.
   * @param {Array<TimePeriod>} longTasks
   * @param {{timestamps: {navigationStart: number, traceEnd: number}}} traceOfTab
   * @return {Array<TimePeriod>}
   */
  static _findCPUQuietPeriods(longTasks, traceOfTab) {
    const navStartTsInMs = traceOfTab.timestamps.navigationStart / 1000;
    const traceEndTsInMs = traceOfTab.timestamps.traceEnd / 1000;
    if (longTasks.length === 0) {
      return [{start: 0, end: traceEndTsInMs}];
    }

    /** @type {Array<TimePeriod>} */
    const quietPeriods = [];
    longTasks.forEach((task, index) => {
      if (index === 0) {
        quietPeriods.push({
          start: 0,
          end: task.start + navStartTsInMs,
        });
      }

      if (index === longTasks.length - 1) {
        quietPeriods.push({
          start: task.end + navStartTsInMs,
          end: traceEndTsInMs,
        });
      } else {
        quietPeriods.push({
          start: task.end + navStartTsInMs,
          end: longTasks[index + 1].start + navStartTsInMs,
        });
      }
    });

    return quietPeriods;
  }

  /**
   * Finds the first time period where a network quiet period and a CPU quiet period overlap.
   * @param {Array<TimePeriod>} longTasks
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Artifacts.TraceOfTab} traceOfTab
   * @return {{cpuQuietPeriod: TimePeriod, networkQuietPeriod: TimePeriod, cpuQuietPeriods: Array<TimePeriod>, networkQuietPeriods: Array<TimePeriod>}}
   */
  static findOverlappingQuietPeriods(longTasks, networkRecords, traceOfTab) {
    const FcpTsInMs = traceOfTab.timestamps.firstContentfulPaint / 1000;

    /** @type {function(TimePeriod):boolean} */
    const isLongEnoughQuietPeriod = period =>
        period.end > FcpTsInMs + REQUIRED_QUIET_WINDOW &&
        period.end - period.start >= REQUIRED_QUIET_WINDOW;
    const networkQuietPeriods = this._findNetworkQuietPeriods(networkRecords, traceOfTab)
        .filter(isLongEnoughQuietPeriod);
    const cpuQuietPeriods = this._findCPUQuietPeriods(longTasks, traceOfTab)
        .filter(isLongEnoughQuietPeriod);

    const cpuQueue = cpuQuietPeriods.slice();
    const networkQueue = networkQuietPeriods.slice();

    // We will check for a CPU quiet period contained within a Network quiet period or vice-versa
    let cpuCandidate = cpuQueue.shift();
    let networkCandidate = networkQueue.shift();
    while (cpuCandidate && networkCandidate) {
      if (cpuCandidate.start >= networkCandidate.start) {
        // CPU starts later than network, window must be contained by network or we check the next
        if (networkCandidate.end >= cpuCandidate.start + REQUIRED_QUIET_WINDOW) {
          return {
            cpuQuietPeriod: cpuCandidate,
            networkQuietPeriod: networkCandidate,
            cpuQuietPeriods,
            networkQuietPeriods,
          };
        } else {
          networkCandidate = networkQueue.shift();
        }
      } else {
        // Network starts later than CPU, window must be contained by CPU or we check the next
        if (cpuCandidate.end >= networkCandidate.start + REQUIRED_QUIET_WINDOW) {
          return {
            cpuQuietPeriod: cpuCandidate,
            networkQuietPeriod: networkCandidate,
            cpuQuietPeriods,
            networkQuietPeriods,
          };
        } else {
          cpuCandidate = cpuQueue.shift();
        }
      }
    }

    throw new LHError(
      cpuCandidate
        ? LHError.errors.NO_TTI_NETWORK_IDLE_PERIOD
        : LHError.errors.NO_TTI_CPU_IDLE_PERIOD
    );
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    return LanternInteractive.request(data, context);
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data) {
    const {traceOfTab, networkRecords} = data;

    if (!traceOfTab.timestamps.domContentLoaded) {
      throw new LHError(LHError.errors.NO_DCL);
    }

    const longTasks = TracingProcessor.getMainThreadTopLevelEvents(traceOfTab)
        .filter(event => event.duration >= 50);
    const quietPeriodInfo = Interactive.findOverlappingQuietPeriods(
      longTasks,
      networkRecords,
      traceOfTab
    );

    const cpuQuietPeriod = quietPeriodInfo.cpuQuietPeriod;

    const timestamp = Math.max(
      cpuQuietPeriod.start,
      traceOfTab.timestamps.firstContentfulPaint / 1000,
      traceOfTab.timestamps.domContentLoaded / 1000
    ) * 1000;
    const timing = (timestamp - traceOfTab.timestamps.navigationStart) / 1000;
    return Promise.resolve({timing, timestamp});
  }
}

module.exports = makeComputedArtifact(Interactive);

/**
 * @typedef TimePeriod
 * @property {number} start
 * @property {number} end
 */
