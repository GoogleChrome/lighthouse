/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to show a breakdown of execution timings on the main thread
 */

'use strict';

const Audit = require('./audit.js');
const {taskGroups} = require('../lib/tracehouse/task-groups.js');
const i18n = require('../lib/i18n/i18n.js');
const MainThreadTasks = require('../computed/main-thread-tasks.js');

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Minimizes main-thread work',
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did to load the page. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Minimize main-thread work',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce JS execution times. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Consider reducing the time spent parsing, compiling and executing JS. ' +
    'You may find delivering smaller JS payloads helps with this. ' +
    '[Learn more](https://web.dev/mainthread-work-breakdown)',
  /** Label for the Main Thread Category column in data tables, rows will have a main thread Category and main thread Task Name. */
  columnCategory: 'Category',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
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
      {key: 'groupLabel', itemType: 'text', text: str_(UIStrings.columnCategory)},
      {key: 'duration', itemType: 'ms', granularity: 1, text: str_(i18n.UIStrings.columnTimeSpent)},
    ];

    results.sort((a, b) => categoryTotals[b.group] - categoryTotals[a.group]);
    const tableDetails = MainThreadWorkBreakdown.makeTableDetails(headings, results);

    const score = Audit.computeLogNormalScore(
      {p10: context.options.p10, median: context.options.median},
      totalExecutionTime
    );

    return {
      score,
      numericValue: totalExecutionTime,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs: totalExecutionTime}),
      details: tableDetails,
    };
  }
}

module.exports = MainThreadWorkBreakdown;
module.exports.UIStrings = UIStrings;
