/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {MainThreadTasks as MainThreadTasksComputed} from '../computed/main-thread-tasks.js';

class MainThreadTasks extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'main-thread-tasks',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Tasks',
      description: 'Lists the toplevel main thread tasks that executed during page load.',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const tasks = await MainThreadTasksComputed.request(trace, context);

    const results = tasks
      // Filter to just the sizable toplevel tasks; toplevel tasks are tasks without a parent.
      .filter(task => task.duration > 5 && !task.parent)
      .map(task => {
        return {
          duration: task.duration,
          startTime: task.startTime,
        };
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'startTime', valueType: 'ms', granularity: 1, label: 'Start Time'},
      {key: 'duration', valueType: 'ms', granularity: 1, label: 'End Time'},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);

    return {
      score: 1,
      details: tableDetails,
    };
  }
}

export default MainThreadTasks;
