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
    return MainThreadTasks_.getMainThreadTasks(mainThreadEvents, frames, timestamps.traceEnd,
        timestamps.timeOrigin);
  }
}

const MainThreadTasksComputed = makeComputedArtifact(MainThreadTasks, null);
export {MainThreadTasksComputed as MainThreadTasks};
