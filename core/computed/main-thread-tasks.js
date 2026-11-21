/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {MainThreadTasks as MainThreadTasks_} from '../lib/tracehouse/main-thread-tasks.js';
import {ProcessedTrace} from './processed-trace.js';

class MainThreadTasks {
  /**
   * @param {LH.Trace} trace
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<Array<LH.Artifacts.TaskNode>>}
   */
  static async compute_(trace, context) {
    const {mainThreadEvents, frames, timestamps} = await ProcessedTrace.request(trace, context);
    const tasks = MainThreadTasks_.getMainThreadTasks(mainThreadEvents, frames, timestamps.traceEnd,
        timestamps.timeOrigin);

    /** @type {Set<LH.Artifacts.TaskNode>} */
    const beforeNavigation = new Set();
    // Tasks are sorted with parents before their children.
    return tasks.filter(task => {
      const isBeforeNavigation = task.parent ?
        beforeNavigation.has(task.parent) : task.endTime <= 0;
      if (isBeforeNavigation) beforeNavigation.add(task);
      return !isBeforeNavigation;
    });
  }
}

const MainThreadTasksComputed = makeComputedArtifact(MainThreadTasks, null);
export {MainThreadTasksComputed as MainThreadTasks};
