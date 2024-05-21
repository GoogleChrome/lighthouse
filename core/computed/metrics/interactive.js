/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';
import {LanternInteractive} from './lantern-interactive.js';
import {NetworkMonitor} from '../../gather/driver/network-monitor.js';
import {TraceProcessor} from '../../lib/tracehouse/trace-processor.js';
import {LighthouseError} from '../../lib/lh-error.js';

const REQUIRED_QUIET_WINDOW = 5000;
const ALLOWED_CONCURRENT_REQUESTS = 2;

/**
 * @fileoverview Computes "Time To Interactive", the time at which the page has loaded critical
 * resources and is mostly idle.
 * @see https://docs.google.com/document/d/1yE4YWsusi5wVXrnwhR61j-QyjK9tzENIzfxrCjA1NAk/edit#heading=h.yozfsuqcgpc4
 */
class Interactive extends NavigationMetric {
  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests (2).
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {{timestamps: {traceEnd: number}}} processedNavigation
   * @return {Array<TimePeriod>}
   */
  static _findNetworkQuietPeriods(networkRecords, processedNavigation) {
    const traceEndTsInMs = processedNavigation.timestamps.traceEnd / 1000;
    // Ignore records that failed, never finished, or were POST/PUT/etc.
    const filteredNetworkRecords = networkRecords.filter(record => {
      return record.finished && record.requestMethod === 'GET' && !record.failed &&
          // Consider network records that had 4xx/5xx status code as "failed"
          record.statusCode < 400;
    });
    return NetworkMonitor.findNetworkQuietPeriods(filteredNetworkRecords,
      ALLOWED_CONCURRENT_REQUESTS, traceEndTsInMs);
  }

  /**
   * Finds all time periods where there are no long tasks.
   * @param {Array<TimePeriod>} longTasks
   * @param {{timestamps: {timeOrigin: number, traceEnd: number}}} processedNavigation
   * @return {Array<TimePeriod>}
   */
  static _findCPUQuietPeriods(longTasks, processedNavigation) {
    const timeOriginTsInMs = processedNavigation.timestamps.timeOrigin / 1000;
    const traceEndTsInMs = processedNavigation.timestamps.traceEnd / 1000;
    if (longTasks.length === 0) {
      return [{start: 0, end: traceEndTsInMs}];
    }

    /** @type {Array<TimePeriod>} */
    const quietPeriods = [];
    longTasks.forEach((task, index) => {
      if (index === 0) {
        quietPeriods.push({
          start: 0,
          end: task.start + timeOriginTsInMs,
        });
      }

      if (index === longTasks.length - 1) {
        quietPeriods.push({
          start: task.end + timeOriginTsInMs,
          end: traceEndTsInMs,
        });
      } else {
        quietPeriods.push({
          start: task.end + timeOriginTsInMs,
          end: longTasks[index + 1].start + timeOriginTsInMs,
        });
      }
    });

    return quietPeriods;
  }

  /**
   * Finds the first time period where a network quiet period and a CPU quiet period overlap.
   * @param {Array<TimePeriod>} longTasks
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Artifacts.ProcessedNavigation} processedNavigation
   * @return {{cpuQuietPeriod: TimePeriod, networkQuietPeriod: TimePeriod, cpuQuietPeriods: Array<TimePeriod>, networkQuietPeriods: Array<TimePeriod>}}
   */
  static findOverlappingQuietPeriods(longTasks, networkRecords, processedNavigation) {
    const FcpTsInMs = processedNavigation.timestamps.firstContentfulPaint / 1000;

    /** @type {function(TimePeriod):boolean} */
    const isLongEnoughQuietPeriod = period =>
        period.end > FcpTsInMs + REQUIRED_QUIET_WINDOW &&
        period.end - period.start >= REQUIRED_QUIET_WINDOW;
    const networkQuietPeriods = this._findNetworkQuietPeriods(networkRecords, processedNavigation)
        .filter(isLongEnoughQuietPeriod);
    const cpuQuietPeriods = this._findCPUQuietPeriods(longTasks, processedNavigation)
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

    throw new LighthouseError(
      cpuCandidate
        ? LighthouseError.errors.NO_TTI_NETWORK_IDLE_PERIOD
        : LighthouseError.errors.NO_TTI_CPU_IDLE_PERIOD
    );
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    const metricData = NavigationMetric.getMetricComputationInput(data);
    return LanternInteractive.request(metricData, context);
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data) {
    const {processedTrace, processedNavigation, networkRecords} = data;

    if (!processedNavigation.timestamps.domContentLoaded) {
      throw new LighthouseError(LighthouseError.errors.NO_DCL);
    }

    const longTasks = TraceProcessor.getMainThreadTopLevelEvents(processedTrace)
        .filter(event => event.duration >= 50);
    const quietPeriodInfo = Interactive.findOverlappingQuietPeriods(
      longTasks,
      networkRecords,
      processedNavigation
    );

    const cpuQuietPeriod = quietPeriodInfo.cpuQuietPeriod;

    const timestamp = Math.max(
      cpuQuietPeriod.start,
      processedNavigation.timestamps.firstContentfulPaint / 1000,
      processedNavigation.timestamps.domContentLoaded / 1000
    ) * 1000;
    const timing = (timestamp - processedNavigation.timestamps.timeOrigin) / 1000;
    return Promise.resolve({timing, timestamp});
  }
}

const InteractiveComputed = makeComputedArtifact(
  Interactive,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {InteractiveComputed as Interactive};

/**
 * @typedef TimePeriod
 * @property {number} start In ms.
 * @property {number} end In ms.
 */
