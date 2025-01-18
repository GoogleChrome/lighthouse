/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit a page to show a breakdown of execution timings on the main thread
 */

import log from 'lighthouse-logger';

import {Audit} from './audit.js';
import {taskGroups} from '../lib/tracehouse/task-groups.js';
import * as i18n from '../lib/i18n/i18n.js';
import {MainThreadTasks} from '../computed/main-thread-tasks.js';
import {TotalBlockingTime} from '../computed/metrics/total-blocking-time.js';
import {Sentry} from '../lib/sentry.js';
import {Util} from '../../shared/util.js';

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Minimizes main-thread work',
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Minimize main-thread work',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce JS execution times. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Consider reducing the time spent parsing, compiling and executing JS. ' +
    'You may find delivering smaller JS payloads helps with this. ' +
    '[Learn how to minimize main-thread work](https://developer.chrome.com/docs/lighthouse/performance/mainthread-work-breakdown/)',
  /** Label for the Main Thread Category column in data tables, rows will have a main thread Category and main thread Task Name. */
  columnCategory: 'Category',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @typedef {import('../lib/tracehouse/task-groups.js').TaskGroupIds} TaskGroupIds */

class MainThreadWorkBreakdown extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'mainthread-work-breakdown',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 1,
      requiredArtifacts: ['traces', 'devtoolsLogs', 'URL', 'GatherContext'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/vhglu1x8zv
      p10: 2017,
      median: 4000,
    };
  }

  /**
   * @param {LH.Artifacts.TaskNode[]} tasks
   * @return {Map<TaskGroupIds, number>}
   */
  static getExecutionTimingsByGroup(tasks) {
    /** @type {Map<TaskGroupIds, number>} */
    const result = new Map();

    for (const task of tasks) {
      const originalTime = result.get(task.group.id) || 0;
      result.set(task.group.id, originalTime + task.selfTime);
    }

    return result;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const trace = artifacts.traces[MainThreadWorkBreakdown.DEFAULT_PASS];

    let tbtSavings = 0;
    try {
      const metricComputationData = Audit.makeMetricComputationDataInput(artifacts, context);
      const tbtResult = await TotalBlockingTime.request(metricComputationData, context);
      tbtSavings = tbtResult.timing;
    } catch (err) {
      Sentry.captureException(err, {
        tags: {audit: this.meta.id},
        level: 'error',
      });
      log.error(this.meta.id, err.message);
    }

    const tasks = await MainThreadTasks.request(trace, context);
    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;

    const executionTimings = MainThreadWorkBreakdown.getExecutionTimingsByGroup(tasks);

    let totalExecutionTime = 0;
    /** @type {Record<string, number>} */
    const categoryTotals = {};
    const results = Array.from(executionTimings).map(([groupId, rawDuration]) => {
      const duration = rawDuration * multiplier;
      totalExecutionTime += duration;

      const categoryTotal = categoryTotals[groupId] || 0;
      categoryTotals[groupId] = categoryTotal + duration;

      return {
        group: groupId,
        groupLabel: taskGroups[groupId].label,
        duration: duration,
      };
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'groupLabel', valueType: 'text', label: str_(UIStrings.columnCategory)},
      {key: 'duration', valueType: 'ms', granularity: 1, label: str_(i18n.UIStrings.columnTimeSpent)},
      /* eslint-enable max-len */
    ];

    results.sort((a, b) => categoryTotals[b.group] - categoryTotals[a.group]);
    const tableDetails = MainThreadWorkBreakdown.makeTableDetails(headings, results,
      {sortedBy: ['duration']});

    const score = Audit.computeLogNormalScore(
      {p10: context.options.p10, median: context.options.median},
      totalExecutionTime
    );

    return {
      score,
      scoreDisplayMode: score >= Util.PASS_THRESHOLD ? Audit.SCORING_MODES.INFORMATIVE : undefined,
      numericValue: totalExecutionTime,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs: totalExecutionTime}),
      details: tableDetails,
      metricSavings: {
        TBT: tbtSavings,
      },
    };
  }
}

export default MainThreadWorkBreakdown;
export {UIStrings};
