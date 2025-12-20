/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const MainThreadTasksComputed = require('../computed/main-thread-tasks.js');

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
      {key: 'startTime', itemType: 'ms', granularity: 1, text: 'Start Time'},
      {key: 'duration', itemType: 'ms', granularity: 1, text: 'End Time'},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);

    return {
      score: 1,
      details: tableDetails,
    };
  }
}

module.exports = MainThreadTasks;
