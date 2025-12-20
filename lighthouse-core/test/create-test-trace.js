/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const pid = 1111;
const tid = 222;
const frame = '3EFC2700D7BC3F4734CAF2F726EFB78C';

/** @typedef {{ts: number, duration: number, children?: Array<ChildTaskDef>}} TopLevelTaskDef */
/** @typedef {{ts: number, duration: number, url: string | undefined}} ChildTaskDef */

/**
 * @param {TopLevelTaskDef} options
 */
function getTopLevelTask({ts, duration}) {
  return {
    name: 'RunTask',
    ts: ts * 1000,
    dur: duration * 1000,
    pid,
    tid,
    ph: 'X',
    cat: 'disabled-by-default-lighthouse',
    args: {
      src_file: '../../third_party/blink/renderer/core/fake_runner.cc',
      src_func: 'FakeRunnerFinished',
    },
  };
}

/**
 * @param {ChildTaskDef} options
 */
function getChildTask({ts, duration, url}) {
  return {
    name: 'FunctionCall',
    ts: ts * 1000,
    dur: duration * 1000,
    pid,
    tid,
    ph: 'X',
    cat: 'disabled-by-default-lighthouse',
    args: {
      src_file: '../../third_party/blink/renderer/core/fake_runner.cc',
      src_func: 'FakeRunnerFinished',
      data: {
        url,
      },
    },
  };
}

/**
 * Creates a simple trace that fits the desired options. Useful for basic trace
 * generation, e.g a trace that will result in particular long-task quiet
 * periods. Input times should be in milliseconds.
 * @param {{navigationStart?: number, traceEnd?: number, topLevelTasks?: Array<TopLevelTaskDef>}} options
 */
function createTestTrace(options) {
  const navStart = (options.navigationStart || 0) * 1000;

  const traceEvents = [{
    name: 'navigationStart',
    ts: navStart,
    pid,
    tid,
    ph: 'R',
    cat: 'blink.user_timing',
    args: {
      frame,
      data: {documentLoaderURL: ''},
    },
  }, {
    name: 'TracingStartedInBrowser',
    ts: navStart,
    pid,
    tid,
    ph: 'I',
    cat: 'disabled-by-default-devtools.timeline',
    args: {
      data: {
        frameTreeNodeId: 6,
        persistentIds: true,
        frames: [{frame, url: 'about:blank', name: '', processId: pid}],
      },
    },
    s: 't',
  }, {
    // Needed to identify main thread for TracingStartedInBrowser.
    name: 'thread_name',
    ts: navStart,
    pid,
    tid,
    ph: 'M',
    cat: '__metadata',
    args: {name: 'CrRendererMain'},
  }, {
    name: 'domContentLoadedEventEnd',
    ts: navStart + 10,
    pid,
    tid,
    ph: 'R',
    cat: 'blink.user_timing,rail',
    args: {frame},
  }, {
    name: 'firstContentfulPaint',
    ts: navStart + 10,
    pid,
    tid,
    ph: 'R',
    cat: 'loading,rail,devtools.timeline',
    args: {frame},
  }, {
    name: 'firstMeaningfulPaint',
    ts: navStart + 15,
    pid,
    tid,
    ph: 'R',
    cat: 'loading,rail,devtools.timeline',
    args: {frame},
  }];

  if (options.topLevelTasks) {
    for (const task of options.topLevelTasks) {
      traceEvents.push(getTopLevelTask(task));
      if (task.children &&
        task.children.length) {
        for (const child of task.children) {
          traceEvents.push(getChildTask(child));
        }
      }
    }
  }

  if (options.traceEnd) {
    // Insert a top level short task to extend trace to requested end.
    traceEvents.push(getTopLevelTask({ts: options.traceEnd - 1, duration: 1}));
  }

  return {traceEvents};
}

module.exports = createTestTrace;
