/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../../types/lh.js';
import {taskGroups, taskNameToGroup} from './task-groups.js';

/**
 * @fileoverview
 *
 * This artifact converts the array of raw trace events into an array of hierarchical
 * tasks for easier consumption and bottom-up analysis.
 *
 * Events are easily produced but difficult to consume. They're a mixture of start/end markers, "complete" events, etc.
 * @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview
 *
 * LH's TaskNode is an artifact that fills in the gaps a trace event leaves behind.
 * i.e. when did it end? which events are children/parents of this one?
 *
 * Each task will have its group/classification, start time, end time,
 * duration, and self time computed. Each task will potentially have a parent, children, and an
 * attributableURL for the script that was executing/forced this execution.
 */

/** @typedef {import('./task-groups.js').TaskGroup} TaskGroup */

/**
 * @typedef TaskNode
 * @prop {LH.TraceEvent} event
 * @prop {LH.TraceEvent|undefined} endEvent
 * @prop {TaskNode[]} children
 * @prop {TaskNode|undefined} parent
 * @prop {boolean} unbounded Indicates that the task had an endTime that was inferred rather than specified in the trace. i.e. in the source trace this task was unbounded.
 * @prop {number} startTime
 * @prop {number} endTime
 * @prop {number} duration
 * @prop {number} selfTime
 * @prop {string[]} attributableURLs
 * @prop {TaskGroup} group
 */

/** @typedef {{timers: Map<string, TaskNode>, xhrs: Map<string, TaskNode>, frameURLsById: Map<string, string>, lastTaskURLs: string[]}} PriorTaskData */

class MainThreadTasks {
  /**
   * @param {LH.TraceEvent} event
   * @param {LH.TraceEvent} [endEvent]
   * @return {TaskNode}
   */
  static _createNewTaskNode(event, endEvent) {
    const isCompleteEvent = event.ph === 'X' && !endEvent;
    const isStartEndEventPair = event.ph === 'B' && endEvent && endEvent.ph === 'E';
    if (!isCompleteEvent && !isStartEndEventPair) {
      throw new Error('Invalid parameters for _createNewTaskNode');
    }

    const startTime = event.ts;
    const endTime = endEvent ? endEvent.ts : event.ts + Number(event.dur || 0);

    const newTask = {
      event,
      endEvent,
      startTime,
      endTime,
      duration: endTime - startTime,

      // These properties will be filled in later
      unbounded: false,
      parent: undefined,
      children: [],
      attributableURLs: [],
      group: taskGroups.other,
      selfTime: NaN,
    };

    return newTask;
  }

  /**
   *
   * @param {TaskNode} currentTask
   * @param {number} stopTs
   * @param {PriorTaskData} priorTaskData
   * @param {Array<LH.TraceEvent>} reverseEventsQueue
   */
  static _assignAllTimersUntilTs(
      currentTask,
      stopTs,
      priorTaskData,
      reverseEventsQueue
  ) {
    while (reverseEventsQueue.length) {
      const nextTimerInstallEvent = reverseEventsQueue.pop();
      // We're out of events to look at; we're done.
      if (!nextTimerInstallEvent) break;

      // Timer event is after our current task; push it back on for next time, and we're done.
      if (nextTimerInstallEvent.ts > stopTs) {
        reverseEventsQueue.push(nextTimerInstallEvent);
        break;
      }

      // Timer event is before the current task, just skip it.
      if (nextTimerInstallEvent.ts < currentTask.startTime) {
        continue;
      }

      // We're right where we need to be, point the timerId to our `currentTask`
      /** @type {string} */
      // @ts-expect-error - timerId exists on `TimerInstall` events.
      const timerId = nextTimerInstallEvent.args.data.timerId;
      priorTaskData.timers.set(timerId, currentTask);
    }
  }

  /**
   * This function takes the start and end events from a thread and creates tasks from them.
   * We do this by iterating through the start and end event arrays simultaneously. For each start
   * event we attempt to find its end event.
   *
   * Because of this matching of start/end events and the need to be mutating our end events queue,
   * we reverse the array to more efficiently `.pop()` them off rather than `.shift()` them off.
   * While it's true the worst case runtime here is O(n^2), ~99.999% of the time the reverse loop is O(1)
   * because the overwhelmingly common case is that end event for a given start event is simply the very next event in our queue.
   *
   * @param {LH.TraceEvent[]} taskStartEvents
   * @param {LH.TraceEvent[]} taskEndEvents
   * @param {number} traceEndTs
   * @return {TaskNode[]}
   */
  static _createTasksFromStartAndEndEvents(taskStartEvents, taskEndEvents, traceEndTs) {
    /** @type {TaskNode[]} */
    const tasks = [];
    // Create a reversed copy of the array to avoid copying the rest of the queue on every mutation.
    // i.e. pop() is O(1) while shift() is O(n), we take the earliest ts element off the queue *a lot*
    // so we'll optimize for having the earliest timestamp events at the end of the array.
    const taskEndEventsReverseQueue = taskEndEvents.slice().reverse();

    for (let i = 0; i < taskStartEvents.length; i++) {
      const taskStartEvent = taskStartEvents[i];
      if (taskStartEvent.ph === 'X') {
        // Task is a complete X event, we have all the information we need already.
        tasks.push(MainThreadTasks._createNewTaskNode(taskStartEvent));
        continue;
      }

      // Task is a B/E event pair, we need to find the matching E event.
      let matchedEventIndex = -1;
      let matchingNestedEventCount = 0;
      let matchingNestedEventIndex = i + 1;

      // We loop through the reversed end events queue from back to front because we still want to
      // see end events in increasing timestamp order.
      // While worst case we will loop through all events, the overwhelmingly common case is that
      // the immediate next event is our event of interest which makes this loop typically O(1).
      for (let j = taskEndEventsReverseQueue.length - 1; j >= 0; j--) {
        const endEvent = taskEndEventsReverseQueue[j];
        // We are considering an end event, so we'll count how many nested events we saw along the way.
        for (; matchingNestedEventIndex < taskStartEvents.length; matchingNestedEventIndex++) {
          if (taskStartEvents[matchingNestedEventIndex].ts >= endEvent.ts) break;

          if (taskStartEvents[matchingNestedEventIndex].name === taskStartEvent.name) {
            matchingNestedEventCount++;
          }
        }

        // The event doesn't have a matching name, skip it.
        if (endEvent.name !== taskStartEvent.name) continue;
        // The event has a timestamp that is too early, skip it.
        if (endEvent.ts < taskStartEvent.ts) continue;

        // The event matches our name and happened after start, the last thing to check is if it was for a nested event.
        if (matchingNestedEventCount > 0) {
          // If it was for a nested event, decrement our counter and move on.
          matchingNestedEventCount--;
          continue;
        }

        // If it wasn't, we found our matching E event! Mark the index and stop the loop.
        matchedEventIndex = j;
        break;
      }

      /** @type {LH.TraceEvent} */
      let taskEndEvent;
      let unbounded = false;
      if (matchedEventIndex === -1) {
        // If we couldn't find an end event, we'll assume it's the end of the trace.
        // If this creates invalid parent/child relationships it will be caught in the next step.
        taskEndEvent = {...taskStartEvent, ph: 'E', ts: traceEndTs};
        unbounded = true;
      } else if (matchedEventIndex === taskEndEventsReverseQueue.length - 1) {
        // Use .pop() in the common case where the immediately next event is needed.
        // It's ~25x faster, https://jsperf.com/pop-vs-splice.
        taskEndEvent = /** @type {LH.TraceEvent} */ (taskEndEventsReverseQueue.pop());
      } else {
        taskEndEvent = taskEndEventsReverseQueue.splice(matchedEventIndex, 1)[0];
      }

      const task = MainThreadTasks._createNewTaskNode(taskStartEvent, taskEndEvent);
      task.unbounded = unbounded;
      tasks.push(task);
    }

    if (taskEndEventsReverseQueue.length) {
      throw new Error(
        `Fatal trace logic error - ${taskEndEventsReverseQueue.length} unmatched end events`
      );
    }

    return tasks;
  }

  /**
   * This function iterates through the tasks to set the `.parent`/`.children` properties of tasks
   * according to their implied nesting structure. If any of these relationships seem impossible based on
   * the timestamps, this method will throw.
   *
   * @param {TaskNode[]} sortedTasks
   * @param {LH.TraceEvent[]} timerInstallEvents
   * @param {PriorTaskData} priorTaskData
   */
  static _createTaskRelationships(sortedTasks, timerInstallEvents, priorTaskData) {
    /** @type {TaskNode|undefined} */
    let currentTask;
    // Create a reversed copy of the array to avoid copying the rest of the queue on every mutation.
    const timerInstallEventsReverseQueue = timerInstallEvents.slice().reverse();

    for (let i = 0; i < sortedTasks.length; i++) {
      let nextTask = sortedTasks[i];

      // Do bookkeeping on XHR requester data.
      if (nextTask.event.name === 'XHRReadyStateChange') {
        const data = nextTask.event.args.data;
        const url = data?.url;
        if (data && url && data.readyState === 1) priorTaskData.xhrs.set(url, nextTask);
      }

      // This inner loop updates what our `currentTask` is at `nextTask.startTime - ε`.
      // While `nextTask` starts after our `currentTask`, close out the task, popup to the parent, and repeat.
      // If at the end `currentTask` is undefined, then `nextTask` is a toplevel task.
      // Otherwise, `nextTask` is a child of `currentTask`.
      while (
        currentTask &&
        Number.isFinite(currentTask.endTime) &&
        currentTask.endTime <= nextTask.startTime
      ) {
        MainThreadTasks._assignAllTimersUntilTs(
          currentTask,
          currentTask.endTime,
          priorTaskData,
          timerInstallEventsReverseQueue
        );
        currentTask = currentTask.parent;
      }

      // If there's a `currentTask`, `nextTask` must be a child.
      // Set the `.parent`/`.children` relationships and timer bookkeeping accordingly.
      if (currentTask) {
        if (nextTask.endTime > currentTask.endTime) {
          const timeDelta = nextTask.endTime - currentTask.endTime;
          // The child task is taking longer than the parent task, which should be impossible.
          // In reality these situations happen, so we allow for some flexibility in trace event times.
          if (timeDelta < 1000) {
            // It's less than 1ms, we'll let it slide by increasing the duration of the parent.
            currentTask.endTime = nextTask.endTime;
            currentTask.duration += timeDelta;

            // Recursively extend parent endTimes, as needed.
            let cur = currentTask.parent;
            while (cur && cur.endTime < nextTask.endTime) {
              cur.duration += nextTask.endTime - cur.endTime;
              cur.endTime = nextTask.endTime;
              cur = cur.parent;
            }
          } else if (nextTask.unbounded) {
            // It's ending at traceEndTs, it means we were missing the end event. We'll truncate it to the parent.
            nextTask.endTime = currentTask.endTime;
            nextTask.duration = nextTask.endTime - nextTask.startTime;
          } else if (
            nextTask.startTime - currentTask.startTime < 1000 &&
            !currentTask.children.length
          ) {
            // The true parent started less than 1ms before the true child, so we're looking at the relationship backwards.
            // We'll let it slide and fix the situation by swapping the two tasks into their correct positions
            // and increasing the duration of the parent.

            // Below is an artistic rendition of the heirarchy we are trying to create.
            //   ████████████currentTask.parent██████████████████
            //       █████████nextTask██████████████
            //      ███████currentTask███████
            const actualParentTask = nextTask;
            const actualChildTask = currentTask;

            // We'll grab the grandparent task to see if we need to fix it.
            // We'll reassign it to be the parent of `actualParentTask` in a bit.
            const grandparentTask = currentTask.parent;
            if (grandparentTask) {
              const lastGrandparentChildIndex = grandparentTask.children.length - 1;
              if (grandparentTask.children[lastGrandparentChildIndex] !== actualChildTask) {
                // The child we need to swap should always be the most recently added child.
                // But if not then there's a serious bug in this code, so double-check.
                throw new Error('Fatal trace logic error - impossible children');
              }

              grandparentTask.children.pop();
              grandparentTask.children.push(actualParentTask);
            }

            actualParentTask.parent = grandparentTask;
            actualParentTask.startTime = actualChildTask.startTime;
            actualParentTask.duration = actualParentTask.endTime - actualParentTask.startTime;
            currentTask = actualParentTask;
            nextTask = actualChildTask;
          } else {
            // None of our workarounds matched. It's time to throw an error.
            // When we fall into this error, it's usually because of one of two reasons.
            //    - There was slop in the opposite direction (child started 1ms before parent),
            //      the child was assumed to be parent instead, and another task already started.
            //    - The child timestamp ended more than 1ms after the parent.
            //      Two unrelated tasks where the first hangs over the second by >1ms is also this case.
            // These have more complicated fixes, so handling separately https://github.com/GoogleChrome/lighthouse/pull/9491#discussion_r327331204.
            /** @type {any} */
            const error = new Error('Fatal trace logic error - child cannot end after parent');
            error.timeDelta = timeDelta;
            error.nextTaskEvent = nextTask.event;
            error.nextTaskEndEvent = nextTask.endEvent;
            error.nextTaskEndTime = nextTask.endTime;
            error.currentTaskEvent = currentTask.event;
            error.currentTaskEndEvent = currentTask.endEvent;
            error.currentTaskEndTime = currentTask.endTime;
            throw error;
          }
        }

        nextTask.parent = currentTask;
        currentTask.children.push(nextTask);
        MainThreadTasks._assignAllTimersUntilTs(
          currentTask,
          nextTask.startTime,
          priorTaskData,
          timerInstallEventsReverseQueue
        );
      }

      currentTask = nextTask;
    }

    if (currentTask) {
      MainThreadTasks._assignAllTimersUntilTs(
        currentTask,
        currentTask.endTime,
        priorTaskData,
        timerInstallEventsReverseQueue
      );
    }
  }

  /**
   * This function takes the raw trace events sorted in increasing timestamp order and outputs connected task nodes.
   * To create the task heirarchy we make several passes over the events.
   *
   *    1. Create three arrays of X/B events, E events, and TimerInstall events.
   *    2. Create tasks for each X/B event, throwing if a matching E event cannot be found for a given B.
   *    3. Sort the tasks by ↑ startTime, ↓ duration.
   *    4. Match each task to its parent, throwing if there is any invalid overlap between tasks.
   *    5. Sort the tasks once more by ↑ startTime, ↓ duration in case they changed during relationship creation.
   *
   * @param {LH.TraceEvent[]} mainThreadEvents
   * @param {PriorTaskData} priorTaskData
   * @param {number} traceEndTs
   * @return {TaskNode[]}
   */
  static _createTasksFromEvents(mainThreadEvents, priorTaskData, traceEndTs) {
    /** @type {Array<LH.TraceEvent>} */
    const taskStartEvents = [];
    /** @type {Array<LH.TraceEvent>} */
    const taskEndEvents = [];
    /** @type {Array<LH.TraceEvent>} */
    const timerInstallEvents = [];

    // Phase 1 - Create three arrays of X/B events, E events, and TimerInstall events.
    for (const event of mainThreadEvents) {
      if (event.ph === 'X' || event.ph === 'B') taskStartEvents.push(event);
      if (event.ph === 'E') taskEndEvents.push(event);
      if (event.name === 'TimerInstall') timerInstallEvents.push(event);
    }

    // Phase 2 - Create tasks for each taskStartEvent.
    const tasks = MainThreadTasks._createTasksFromStartAndEndEvents(
      taskStartEvents,
      taskEndEvents,
      traceEndTs
    );

    // Phase 3 - Sort the tasks by increasing startTime, decreasing duration.
    const sortedTasks = tasks.sort(
      (taskA, taskB) => taskA.startTime - taskB.startTime || taskB.duration - taskA.duration
    );

    // Phase 4 - Match each task to its parent.
    MainThreadTasks._createTaskRelationships(sortedTasks, timerInstallEvents, priorTaskData);

    // Phase 5 - Sort once more in case the order changed after wiring up relationships.
    return sortedTasks.sort(
      (taskA, taskB) => taskA.startTime - taskB.startTime || taskB.duration - taskA.duration
    );
  }

  /**
   * @param {TaskNode} task
   * @param {TaskNode|undefined} parent
   * @return {number}
   */
  static _computeRecursiveSelfTime(task, parent) {
    if (parent && task.endTime > parent.endTime) {
      throw new Error('Fatal trace logic error - child cannot end after parent');
    }

    const childTime = task.children
      .map(child => MainThreadTasks._computeRecursiveSelfTime(child, task))
      .reduce((sum, child) => sum + child, 0);
    task.selfTime = task.duration - childTime;
    return task.duration;
  }

  /**
   * @param {TaskNode} task
   * @param {string[]} parentURLs
   * @param {string[]} allURLsInTree
   * @param {PriorTaskData} priorTaskData
   */
  static _computeRecursiveAttributableURLs(task, parentURLs, allURLsInTree, priorTaskData) {
    const args = task.event.args;
    const argsData = {...(args.beginData || {}), ...(args.data || {})};
    const frame = argsData.frame || '';
    let frameURL = priorTaskData.frameURLsById.get(frame);
    const stackFrameURLs = (argsData.stackTrace || []).map(entry => entry.url);

    // If the frame was an `about:blank` style ad frame, the first real URL will be more relevant to the frame's URL.
    const potentialFrameURL = stackFrameURLs[0];
    if (frame && frameURL && frameURL.startsWith('about:') && potentialFrameURL) {
      priorTaskData.frameURLsById.set(frame, potentialFrameURL);
      frameURL = potentialFrameURL;
    }

    /** @type {Array<string|undefined>} */
    let taskURLs = [];
    switch (task.event.name) {
      /**
       * Some trace events reference a specific script URL that triggered them.
       * Use this URL as the higher precedence attributable URL.
       * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/timeline/TimelineUIUtils.js?type=cs&q=_initEventStyles+-f:out+f:devtools&sq=package:chromium&g=0&l=678-744
       */
      case 'v8.compile':
      case 'EvaluateScript':
      case 'FunctionCall':
        taskURLs = [argsData.url, frameURL];
        break;
      case 'v8.compileModule':
        taskURLs = [task.event.args.fileName];
        break;
      case 'TimerFire': {
        /** @type {string} */
        // @ts-expect-error - timerId exists when name is TimerFire
        const timerId = task.event.args.data.timerId;
        const timerInstallerTaskNode = priorTaskData.timers.get(timerId);
        if (!timerInstallerTaskNode) break;
        taskURLs = timerInstallerTaskNode.attributableURLs;
        break;
      }
      case 'ParseHTML':
        taskURLs = [argsData.url, frameURL];
        break;
      case 'ParseAuthorStyleSheet':
        taskURLs = [argsData.styleSheetUrl, frameURL];
        break;
      case 'UpdateLayoutTree':
      case 'Layout':
      case 'Paint':
        // If we had a specific frame we were updating, just attribute it to that frame.
        if (frameURL) {
          taskURLs = [frameURL];
          break;
        }

        // Otherwise, sometimes Chrome will split layout into separate toplevel task after things have settled.
        // In this case we want to attribute the work to the prior task.
        // Inherit from previous task only if we don't have any task data set already.
        if (allURLsInTree.length) break;
        taskURLs = priorTaskData.lastTaskURLs;
        break;
      case 'XHRReadyStateChange':
      case 'XHRLoad': {
        // Inherit from task that issued the XHR
        const xhrUrl = argsData.url;
        const readyState = argsData.readyState;
        if (!xhrUrl || (typeof readyState === 'number' && readyState !== 4)) break;
        const xhrRequesterTaskNode = priorTaskData.xhrs.get(xhrUrl);
        if (!xhrRequesterTaskNode) break;
        taskURLs = xhrRequesterTaskNode.attributableURLs;
        break;
      }
      default:
        taskURLs = [];
        break;
    }

    /** @type {string[]} */
    const attributableURLs = Array.from(parentURLs);
    for (const url of [...taskURLs, ...stackFrameURLs]) {
      // Don't add empty URLs
      if (!url) continue;
      // Add unique URLs to our overall tree.
      if (!allURLsInTree.includes(url)) allURLsInTree.push(url);
      // Don't add duplicate URLs
      if (attributableURLs.includes(url)) continue;
      attributableURLs.push(url);
    }

    task.attributableURLs = attributableURLs;
    task.children.forEach(child =>
      MainThreadTasks._computeRecursiveAttributableURLs(
        child,
        attributableURLs,
        allURLsInTree,
        priorTaskData
      )
    );

    // After we've traversed the entire tree, set all the empty URLs to the set that we found in the task.
    // This attributes the overhead of browser task management to the scripts that created the work rather than
    // have it fall into the blackhole of "Other".
    if (!attributableURLs.length && !task.parent && allURLsInTree.length) {
      MainThreadTasks._setRecursiveEmptyAttributableURLs(task, allURLsInTree);
    }
  }

  /**
   * @param {TaskNode} task
   * @param {Array<string>} urls
   */
  static _setRecursiveEmptyAttributableURLs(task, urls) {
    // If this task had any attributableURLs, its children will too, so we can stop here.
    if (task.attributableURLs.length) return;

    task.attributableURLs = urls.slice();
    task.children.forEach(child =>
      MainThreadTasks._setRecursiveEmptyAttributableURLs(
        child,
        urls
      )
    );
  }

  /**
   * @param {TaskNode} task
   * @param {TaskGroup} [parentGroup]
   */
  static _computeRecursiveTaskGroup(task, parentGroup) {
    const group = taskNameToGroup[task.event.name];
    task.group = group || parentGroup || taskGroups.other;
    task.children.forEach(child => MainThreadTasks._computeRecursiveTaskGroup(child, task.group));
  }

  /**
   * @param {LH.TraceEvent[]} mainThreadEvents
   * @param {Array<{id: string, url: string}>} frames
   * @param {number} traceEndTs
   * @param {number} [traceStartTs] Optional time-0 ts for tasks. Tasks before this point will have negative start/end times. Defaults to the first task found.
   * @return {TaskNode[]}
   */
  static getMainThreadTasks(mainThreadEvents, frames, traceEndTs, traceStartTs) {
    const timers = new Map();
    const xhrs = new Map();
    const frameURLsById = new Map();
    frames.forEach(({id, url}) => frameURLsById.set(id, url));
    /** @type {Array<string>} */
    const lastTaskURLs = [];
    const priorTaskData = {timers, xhrs, frameURLsById, lastTaskURLs};
    const tasks = MainThreadTasks._createTasksFromEvents(
      mainThreadEvents,
      priorTaskData,
      traceEndTs
    );

    // Compute the recursive properties we couldn't compute earlier, starting at the toplevel tasks
    for (const task of tasks) {
      if (task.parent) continue;

      MainThreadTasks._computeRecursiveSelfTime(task, undefined);
      MainThreadTasks._computeRecursiveAttributableURLs(task, [], [], priorTaskData);
      MainThreadTasks._computeRecursiveTaskGroup(task);
      priorTaskData.lastTaskURLs = task.attributableURLs;
    }

    // Rebase all the times to be relative to start of trace and covert to ms.
    const firstTs = traceStartTs ?? tasks[0].startTime;
    for (const task of tasks) {
      task.startTime = (task.startTime - firstTs) / 1000;
      task.endTime = (task.endTime - firstTs) / 1000;
      task.duration /= 1000;
      task.selfTime /= 1000;

      // Check that we have selfTime which captures all other timing data.
      if (!Number.isFinite(task.selfTime)) {
        throw new Error('Invalid task timing data');
      }
    }

    return tasks;
  }

  /**
   * Prints an artistic rendering of the task tree for easier debugability.
   *
   * @param {TaskNode[]} tasks
   * @param {{printWidth?: number, startTime?: number, endTime?: number, taskLabelFn?: (node: TaskNode) => string}} options
   * @return {string}
   */
  static printTaskTreeToDebugString(tasks, options = {}) {
    const traceEndMs = Math.max(...tasks.map(t => t.endTime), 0);
    const {
      printWidth = 100,
      startTime = 0,
      endTime = traceEndMs,
      taskLabelFn = node => node.event.name,
    } = options;

    /** @param {TaskNode} task */
    function computeTaskDepth(task) {
      let depth = 0;
      for (; task.parent; task = task.parent) depth++;
      return depth;
    }

    const traceRange = endTime - startTime;
    const characterInMs = traceRange / printWidth;

    /** @type {Map<TaskNode, {id: string, task: TaskNode}>} */
    const taskLegend = new Map();

    /** @type {Map<number, TaskNode[]>} */
    const tasksByDepth = new Map();
    for (const task of tasks) {
      if (task.startTime > endTime || task.endTime < startTime) continue;

      const depth = computeTaskDepth(task);
      const tasksAtDepth = tasksByDepth.get(depth) || [];
      tasksAtDepth.push(task);
      tasksByDepth.set(depth, tasksAtDepth);

      // Create a user-friendly ID for new tasks using a capital letter.
      // 65 is the ASCII code for 'A' and there are 26 letters in the english alphabet.
      const id = String.fromCharCode(65 + (taskLegend.size % 26));
      taskLegend.set(task, {id, task});
    }

    const debugStringLines = [
      `Trace Duration: ${traceEndMs.toFixed(0)}ms`,
      `Range: [${startTime}, ${endTime}]`,
      `█ = ${characterInMs.toFixed(2)}ms`,
      '',
    ];

    const increasingDepth = Array.from(tasksByDepth.entries()).sort((a, b) => a[0] - b[0]);
    for (const [, tasks] of increasingDepth) {
      const taskRow = Array.from({length: printWidth}).map(() => ' ');

      for (const task of tasks) {
        const taskStart = Math.max(task.startTime, startTime);
        const taskEnd = Math.min(task.endTime, endTime);

        const {id} = taskLegend.get(task) || {id: '?'};
        const startIndex = Math.floor(taskStart / characterInMs);
        const endIndex = Math.floor(taskEnd / characterInMs);
        const idIndex = Math.floor((startIndex + endIndex) / 2);
        for (let i = startIndex; i <= endIndex; i++) taskRow[i] = '█';
        for (let i = 0; i < id.length; i++) taskRow[idIndex] = id;
      }

      debugStringLines.push(taskRow.join(''));
    }

    debugStringLines.push('');
    for (const {id, task} of taskLegend.values()) {
      debugStringLines.push(`${id} = ${taskLabelFn(task)}`);
    }

    return debugStringLines.join('\n');
  }
}

export {MainThreadTasks};
