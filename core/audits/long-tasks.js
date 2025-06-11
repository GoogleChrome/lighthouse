/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lib/lantern/lantern.js';
import {Audit} from './audit.js';
import {NetworkRecords} from '../computed/network-records.js';
import * as i18n from '../lib/i18n/i18n.js';
import {MainThreadTasks} from '../computed/main-thread-tasks.js';
import {PageDependencyGraph} from '../computed/page-dependency-graph.js';
import {LoadSimulator} from '../computed/load-simulator.js';
import {getJavaScriptURLs, getAttributableURLForTask} from '../lib/tracehouse/task-summary.js';
import {TotalBlockingTime} from '../computed/metrics/total-blocking-time.js';

/** We don't always have timing data for short tasks, if we're missing timing data. Treat it as though it were 0ms. */
const DEFAULT_TIMING = {startTime: 0, endTime: 0, duration: 0};
const DISPLAYED_TASK_COUNT = 20;

const UIStrings = {
  /** Title of a diagnostic LH audit that provides details on the longest running tasks that occur when the page loads. */
  title: 'Avoid long main-thread tasks',
  /** Description of a diagnostic LH audit that shows the user the longest running tasks that occur when the page loads. */
  description: 'Lists the longest tasks on the main thread, ' +
    'useful for identifying worst contributors to input delay. ' +
    '[Learn how to avoid long main-thread tasks](https://web.dev/articles/optimize-long-tasks)',
  /** [ICU Syntax] Label identifying the number of long-running CPU tasks that occurred while loading a web page. */
  displayValue: `{itemCount, plural,
  =1 {# long task found}
  other {# long tasks found}
  }`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * Insert `url` into `urls` array if not already present. Returns
 * the index of `url` in `urls` for later lookup.
 * @param {Array<string>} urls
 * @param {string} url
 */
function insertUrl(urls, url) {
  const index = urls.indexOf(url);
  if (index > -1) return index;
  return urls.push(url) - 1;
}

/**
 * @param {number} value
 * @return {number}
 */
function roundTenths(value) {
  return Math.round(value * 10) / 10;
}

/** @typedef {import('../lib/tracehouse/task-groups.js').TaskGroupIds} TaskGroupIds */
/** @typedef {{startTime: number, duration: number}} Timing */
/** @typedef {Timing & {urlIndex: number, [p: string]: number}} DebugTask */

class LongTasks extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'long-tasks',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'URL', 'GatherContext', 'SourceMaps'],
      guidanceLevel: 1,
    };
  }

  /**
   * Returns the timing information for the given task, recursively walking the
   * task's children and adding up time spent in each type of task activity.
   * If `taskTimingsByEvent` is present, it will be used for task timing instead
   * of the timings on the tasks themselves.
   * If `timeByTaskGroup` is not provided, a new Map will be populated with
   * timing breakdown; if one is provided, timing breakdown will be added to the
   * existing breakdown.
   *
   * TODO: when simulated, a significant number of child tasks are dropped, so
   * most time will be attributed to 'other' (the category of the top-level
   * RunTask). See pruning in `PageDependencyGraph.linkCPUNodes`.
   * @param {LH.Artifacts.TaskNode} task
   * @param {Map<Lantern.Types.TraceEvent, LH.Gatherer.Simulation.NodeTiming>|undefined} taskTimingsByEvent
   * @param {Map<TaskGroupIds, number>} [timeByTaskGroup]
   * @return {{startTime: number, duration: number, timeByTaskGroup: Map<TaskGroupIds, number>}}
   */
  static getTimingBreakdown(task, taskTimingsByEvent, timeByTaskGroup = new Map()) {
    const taskTiming = LongTasks.getTiming(task, taskTimingsByEvent);

    // Add up child time, while recursively stepping in to accumulate group times.
    let childrenTime = 0;
    if (taskTiming.duration > 0) {
      for (const child of task.children) {
        const {duration} = LongTasks.getTimingBreakdown(child, taskTimingsByEvent, timeByTaskGroup);
        childrenTime += duration;
      }
    }

    // Add this task's selfTime to its group's total time.
    const selfTime = taskTiming.duration - childrenTime;
    const taskGroupTime = timeByTaskGroup.get(task.group.id) || 0;
    timeByTaskGroup.set(task.group.id, taskGroupTime + selfTime);

    return {
      startTime: taskTiming.startTime,
      duration: taskTiming.duration,
      timeByTaskGroup,
    };
  }

  /**
   * @param {Array<LH.Artifacts.TaskNode>} longTasks
   * @param {Set<string>} jsUrls
   * @param {Map<Lantern.Types.TraceEvent, LH.Gatherer.Simulation.NodeTiming>|undefined} taskTimingsByEvent
   * @return {LH.Audit.Details.DebugData}
   */
  static makeDebugData(longTasks, jsUrls, taskTimingsByEvent) {
    /** @type {Array<string>} */
    const urls = [];
    /** @type {Array<DebugTask>} */
    const tasks = [];

    for (const longTask of longTasks) {
      const attributableUrl = getAttributableURLForTask(longTask, jsUrls);

      const {startTime, duration, timeByTaskGroup} =
          LongTasks.getTimingBreakdown(longTask, taskTimingsByEvent);

      // Round time per group and sort entries so order is consistent.
      const timeByTaskGroupEntries = [...timeByTaskGroup]
        .map(/** @return {[TaskGroupIds, number]} */ ([group, time]) => [group, roundTenths(time)])
        .sort((a, b) => a[0].localeCompare(b[0]));

      tasks.push({
        urlIndex: insertUrl(urls, attributableUrl),
        startTime: roundTenths(startTime),
        duration: roundTenths(duration),
        ...Object.fromEntries(timeByTaskGroupEntries),
      });
    }

    return {
      type: 'debugdata',
      urls,
      tasks,
    };
  }

  /**
   * Get timing from task, overridden by taskTimingsByEvent if provided.
   * @param {LH.Artifacts.TaskNode} task
   * @param {Map<Lantern.Types.TraceEvent, LH.Gatherer.Simulation.NodeTiming>|undefined} taskTimingsByEvent
   * @return {Timing}
   */
  static getTiming(task, taskTimingsByEvent) {
    /** @type {Timing} */
    let timing = task;
    if (taskTimingsByEvent) {
      timing = taskTimingsByEvent.get(task.event) || DEFAULT_TIMING;
    }

    const {duration, startTime} = timing;
    return {duration, startTime};
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const {URL, SourceMaps} = artifacts;
    const trace = artifacts.Trace;
    const tasks = await MainThreadTasks.request(trace, context);
    const devtoolsLog = artifacts.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    const metricComputationData = Audit.makeMetricComputationDataInput(artifacts, context);
    const tbtResult = await TotalBlockingTime.request(metricComputationData, context);

    /** @type {Map<Lantern.Types.TraceEvent, LH.Gatherer.Simulation.NodeTiming>|undefined} */
    let taskTimingsByEvent;

    if (settings.throttlingMethod === 'simulate') {
      taskTimingsByEvent = new Map();

      const simulatorOptions = {devtoolsLog, settings: context.settings};
      const pageGraph =
        // eslint-disable-next-line max-len
        await PageDependencyGraph.request({settings, trace, devtoolsLog, URL, SourceMaps, fromTrace: false}, context);
      const simulator = await LoadSimulator.request(simulatorOptions, context);
      const simulation = simulator.simulate(pageGraph, {label: 'long-tasks-diagnostic'});
      for (const [node, timing] of simulation.nodeTimings.entries()) {
        if (node.type !== 'cpu') continue;
        taskTimingsByEvent.set(node.event, timing);
      }
    }

    const jsURLs = getJavaScriptURLs(networkRecords);

    // Only consider top-level (no parent) long tasks that have an explicit endTime.
    const longTasks = tasks
      .map(task => {
        // Use duration from simulation, if available.
        const {duration} = LongTasks.getTiming(task, taskTimingsByEvent);
        return {task, duration};
      })
      .filter(({task, duration}) => {
        return duration >= 50 && !task.unbounded && !task.parent;
      })
      .sort((a, b) => b.duration - a.duration)
      .map(({task}) => task);

    // TODO(beytoven): Add start time that matches with the simulated throttling
    const results = longTasks.map(task => {
      const timing = LongTasks.getTiming(task, taskTimingsByEvent);
      return {
        url: getAttributableURLForTask(task, jsURLs),
        duration: timing.duration,
        startTime: timing.startTime,
      };
    }).slice(0, DISPLAYED_TASK_COUNT);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'startTime', valueType: 'ms', granularity: 1, label: str_(i18n.UIStrings.columnStartTime)},
      {key: 'duration', valueType: 'ms', granularity: 1, label: str_(i18n.UIStrings.columnDuration)},
      /* eslint-enable max-len */
    ];

    const tableDetails = Audit.makeTableDetails(headings, results,
      {sortedBy: ['duration'], skipSumming: ['startTime']});

    tableDetails.debugData = LongTasks.makeDebugData(longTasks, jsURLs, taskTimingsByEvent);

    let displayValue;
    if (results.length > 0) {
      displayValue = str_(UIStrings.displayValue, {itemCount: results.length});
    }

    return {
      score: results.length === 0 ? 1 : 0,
      notApplicable: results.length === 0,
      details: tableDetails,
      displayValue,
      metricSavings: {
        TBT: tbtResult.timing,
      },
    };
  }
}

export default LongTasks;
export {UIStrings};
