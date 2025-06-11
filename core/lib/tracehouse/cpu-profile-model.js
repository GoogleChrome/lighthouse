/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {MainThreadTasks} from './main-thread-tasks.js';

const SAMPLER_TRACE_EVENT_NAME = 'FunctionCall-SynthesizedByProfilerModel';

/**
 * @fileoverview
 *
 * This model converts the `Profile` and `ProfileChunk` mega trace events from the `disabled-by-default-v8.cpu_profiler`
 * category into B/E-style trace events that main-thread-tasks.js already knows how to parse into a task tree.
 *
 * The V8 CPU profiler measures where time is being spent by sampling the stack (See https://www.jetbrains.com/help/profiler/Profiling_Guidelines__Choosing_the_Right_Profiling_Mode.html
 * for a generic description of the differences between tracing and sampling).
 *
 * A `Profile` event is a record of the stack that was being executed at different sample points in time.
 * It has a structure like this:
 *
 *    nodes: [function A, function B, function C]
 *    samples: [node with id 2, node with id 1, ...]
 *    timeDeltas: [4125μs since last sample, 121μs since last sample, ...]
 *
 * Note that this is subtly different from the protocol-based Crdp.Profiler.Profile type.
 *
 * Helpful prior art:
 * @see https://cs.chromium.org/chromium/src/third_party/devtools-frontend/src/front_end/sdk/CPUProfileDataModel.js?sq=package:chromium&g=0&l=42
 * @see https://github.com/v8/v8/blob/99ca333b0efba3236954b823101315aefeac51ab/tools/profile.js
 * @see https://github.com/jlfwong/speedscope/blob/9ed1eb192cb7e9dac43a5f25bd101af169dc654a/src/import/chrome.ts#L200
 */

/**
 * @typedef CpuProfile
 * @property {string} id
 * @property {number} pid
 * @property {number} tid
 * @property {number} startTime
 * @property {Required<LH.TraceCpuProfile>['nodes']} nodes
 * @property {Array<number>} samples
 * @property {Array<number>} timeDeltas
 */

/** @typedef {Required<Required<LH.TraceEvent['args']>['data']>['_syntheticProfilerRange']} ProfilerRange */
/** @typedef {LH.TraceEvent & {args: {data: {_syntheticProfilerRange: ProfilerRange}}}} SynthethicEvent */
/** @typedef {Omit<LH.Artifacts.TaskNode, 'event'> & {event: SynthethicEvent, endEvent: SynthethicEvent}} SynthethicTaskNode */

class CpuProfileModel {
  /**
   * @param {CpuProfile} profile
   */
  constructor(profile) {
    this._profile = profile;
    this._nodesById = this._createNodeMap();
    this._activeNodeArraysById = this._createActiveNodeArrays();
  }

  /**
   * Initialization function to enable O(1) access to nodes by node ID.
   * @return {Map<number, CpuProfile['nodes'][0]>}
   */
  _createNodeMap() {
    /** @type {Map<number, CpuProfile['nodes'][0]>} */
    const map = new Map();
    for (const node of this._profile.nodes) {
      map.set(node.id, node);
    }

    return map;
  }

  /**
   * Initialization function to enable O(1) access to the set of active nodes in the stack by node ID.
   * @return {Map<number, Array<number>>}
   */
  _createActiveNodeArrays() {
    /** @type {Map<number, Array<number>>} */
    const map = new Map();
    /** @param {number} id @return {Array<number>} */
    const getActiveNodes = id => {
      if (map.has(id)) return map.get(id) || [];

      const node = this._nodesById.get(id);
      if (!node) throw new Error(`No such node ${id}`);
      if (typeof node.parent === 'number') {
        const array = getActiveNodes(node.parent).concat([id]);
        map.set(id, array);
        return array;
      } else {
        return [id];
      }
    };

    for (const node of this._profile.nodes) {
      map.set(node.id, getActiveNodes(node.id));
    }

    return map;
  }

  /**
   * Returns all the node IDs in a stack when a specific nodeId is at the top of the stack
   * (i.e. a stack's node ID and the node ID of all of its parents).
   *
   * @param {number} nodeId
   * @return {Array<number>}
   */
  _getActiveNodeIds(nodeId) {
    const activeNodeIds = this._activeNodeArraysById.get(nodeId);
    if (!activeNodeIds) throw new Error(`No such node ID ${nodeId}`);
    return activeNodeIds;
  }

  /**
   * Generates the necessary B/E-style trace events for a single transition from stack A to stack B
   * at the given latest timestamp (includes possible range in event.args.data).
   *
   * Example:
   *
   *    latestPossibleTimestamp 1234
   *    previousNodeIds 1,2,3
   *    currentNodeIds 1,2,4
   *
   *    yields [end 3 at ts 1234, begin 4 at ts 1234]
   *
   * @param {number} earliestPossibleTimestamp
   * @param {number} latestPossibleTimestamp
   * @param {Array<number>} previousNodeIds
   * @param {Array<number>} currentNodeIds
   * @return {Array<SynthethicEvent>}
   */
  _synthesizeTraceEventsForTransition(
      earliestPossibleTimestamp,
      latestPossibleTimestamp,
      previousNodeIds,
      currentNodeIds
  ) {
    const startNodes = currentNodeIds
      .filter(id => !previousNodeIds.includes(id))
      .map(id => this._nodesById.get(id))
      .filter(node => !!node);
    const endNodes = previousNodeIds
      .filter(id => !currentNodeIds.includes(id))
      .map(id => this._nodesById.get(id))
      .filter(node => !!node);

    /** @param {CpuProfile['nodes'][0]} node @return {SynthethicEvent} */
    const createSyntheticEvent = node => ({
      ts: Number.isFinite(latestPossibleTimestamp)
        ? latestPossibleTimestamp
        : earliestPossibleTimestamp,
      pid: this._profile.pid,
      tid: this._profile.tid,
      dur: 0,
      ph: 'I',
      // This trace event name is Lighthouse-specific and wouldn't be found in a real trace.
      // Attribution logic in main-thread-tasks.js special cases this event.
      name: SAMPLER_TRACE_EVENT_NAME,
      cat: 'lighthouse',
      args: {
        data: {
          callFrame: node.callFrame,
          _syntheticProfilerRange: {earliestPossibleTimestamp, latestPossibleTimestamp},
        },
      },
    });

    /** @type {Array<SynthethicEvent>} */
    const startEvents = startNodes.map(createSyntheticEvent).map(evt => ({...evt, ph: 'B'}));
    /** @type {Array<SynthethicEvent>} */
    const endEvents = endNodes.map(createSyntheticEvent).map(evt => ({...evt, ph: 'E'}));
    // Ensure we put end events in first to finish prior tasks before starting new ones.
    return [...endEvents.reverse(), ...startEvents];
  }

  /**
   * @param {LH.TraceEvent | undefined} event
   * @return {event is SynthethicEvent}
   */
  static isSyntheticEvent(event) {
    if (!event) return false;
    return Boolean(
      event.name === SAMPLER_TRACE_EVENT_NAME &&
      event.args.data?._syntheticProfilerRange
    );
  }

  /**
   * @param {LH.Artifacts.TaskNode} task
   * @return {task is SynthethicTaskNode}
   */
  static isSyntheticTask(task) {
    return CpuProfileModel.isSyntheticEvent(task.event) &&
      CpuProfileModel.isSyntheticEvent(task.endEvent);
  }

  /**
   * Finds all the tasks that started or ended (depending on `type`) within the provided time range.
   * Uses a memory index to remember the place in the array the last invocation left off to avoid
   * re-traversing the entire array, but note that this index might still be slightly off from the
   * true start position.
   *
   * @param {Array<{startTime: number, endTime: number}>} knownTasks
   * @param {{type: 'startTime'|'endTime', initialIndex: number, earliestPossibleTimestamp: number, latestPossibleTimestamp: number}} options
   */
  static _getTasksInRange(knownTasks, options) {
    const {type, initialIndex, earliestPossibleTimestamp, latestPossibleTimestamp} = options;

    // We may have overshot a little from last time, so back up to find the real starting index.
    let startIndex = initialIndex;
    while (startIndex > 0) {
      const task = knownTasks[startIndex];
      if (task && task[type] < earliestPossibleTimestamp) break;
      startIndex--;
    }

    /** @type {Array<{startTime: number, endTime: number}>} */
    const matchingTasks = [];
    for (let i = startIndex; i < knownTasks.length; i++) {
      const task = knownTasks[i];
      // Task is before our range of interest, keep looping.
      if (task[type] < earliestPossibleTimestamp) continue;

      // Task is after our range of interest, we're done.
      if (task[type] > latestPossibleTimestamp) {
        return {tasks: matchingTasks, lastIndex: i};
      }

      // Task is in our range of interest, add it to our list.
      matchingTasks.push(task);
    }

    // We went through all tasks before reaching the end of our range.
    return {tasks: matchingTasks, lastIndex: knownTasks.length};
  }

  /**
   * Given a particular time range and a set of known true tasks, find the correct timestamp to use
   * for a transition between tasks.
   *
   * Because the sampling profiler only provides a *range* of start/stop function boundaries, this
   * method uses knowledge of a known set of tasks to find the most accurate timestamp for a particular
   * range. For example, if we know that a function ended between 800ms and 810ms, we can use the
   * knowledge that a toplevel task ended at 807ms to use 807ms as the correct endtime for this function.
   *
   * @param {{syntheticTask: SynthethicTaskNode, eventType: 'start'|'end', allEventsAtTs: {naive: Array<SynthethicEvent>, refined: Array<SynthethicEvent>}, knownTaskStartTimeIndex: number, knownTaskEndTimeIndex: number, knownTasksByStartTime: Array<{startTime: number, endTime: number}>, knownTasksByEndTime: Array<{startTime: number, endTime: number}>}} data
   * @return {{timestamp: number, lastStartTimeIndex: number, lastEndTimeIndex: number}}
   */
  static _findEffectiveTimestamp(data) {
    const {
      eventType,
      syntheticTask,
      allEventsAtTs,
      knownTasksByStartTime,
      knownTaskStartTimeIndex,
      knownTasksByEndTime,
      knownTaskEndTimeIndex,
    } = data;

    const targetEvent = eventType === 'start' ? syntheticTask.event : syntheticTask.endEvent;
    const pairEvent = eventType === 'start' ? syntheticTask.endEvent : syntheticTask.event;

    const timeRange = targetEvent.args.data._syntheticProfilerRange;
    const pairTimeRange = pairEvent.args.data._syntheticProfilerRange;

    const {tasks: knownTasksStarting, lastIndex: lastStartTimeIndex} = this._getTasksInRange(
      knownTasksByStartTime,
      {
        type: 'startTime',
        initialIndex: knownTaskStartTimeIndex,
        earliestPossibleTimestamp: timeRange.earliestPossibleTimestamp,
        latestPossibleTimestamp: timeRange.latestPossibleTimestamp,
      }
    );

    const {tasks: knownTasksEnding, lastIndex: lastEndTimeIndex} = this._getTasksInRange(
      knownTasksByEndTime,
      {
        type: 'endTime',
        initialIndex: knownTaskEndTimeIndex,
        earliestPossibleTimestamp: timeRange.earliestPossibleTimestamp,
        latestPossibleTimestamp: timeRange.latestPossibleTimestamp,
      }
    );

    // First, find all the tasks that span *across* (not fully contained within) our ambiguous range.
    const knownTasksStartingNotContained = knownTasksStarting
      .filter(t => !knownTasksEnding.includes(t));
    const knownTasksEndingNotContained = knownTasksEnding
      .filter(t => !knownTasksStarting.includes(t));

    // Each one of these spanning tasks can be in one of three situations:
    //    - Task is a parent of the sample.
    //    - Task is a child of the sample.
    //    - Task has no overlap with the sample.

    // Parent tasks must satisfy...
    //     parentTask.startTime <= syntheticTask.startTime
    //                         AND
    //     syntheticTask.endTime <= parentTask.endTime
    const parentTasks =
      eventType === 'start'
        ? knownTasksStartingNotContained.filter(
            t => t.endTime >= pairTimeRange.earliestPossibleTimestamp
          )
        : knownTasksEndingNotContained.filter(
            t => t.startTime <= pairTimeRange.latestPossibleTimestamp
          );

    // Child tasks must satisfy...
    //     syntheticTask.startTime <= childTask.startTime
    //                         AND
    //     childTask.endTime <= syntheticTask.endTime
    const childTasks =
      eventType === 'start'
        ? knownTasksStartingNotContained.filter(
            t => t.endTime < pairTimeRange.earliestPossibleTimestamp
          )
        : knownTasksEndingNotContained.filter(
            t => t.startTime > pairTimeRange.latestPossibleTimestamp
          );

    // Unrelated tasks must satisfy...
    //     unrelatedTask.endTime <= syntheticTask.startTime
    //                       OR
    //     syntheticTask.endTime <= unrelatedTask.startTime
    const unrelatedTasks =
          eventType === 'start' ? knownTasksEndingNotContained : knownTasksStartingNotContained;

    // Now we narrow our allowable range using the three types of tasks and the other events
    // that we've already refined.
    const minimumTs = Math.max(
      // Sampled event couldn't be earlier than this to begin with.
      timeRange.earliestPossibleTimestamp,
      // Sampled start event can't be before its parent started.
      // Sampled end event can't be before its child ended.
      ...(eventType === 'start'
        ? parentTasks.map(t => t.startTime)
        : childTasks.map(t => t.endTime)),
      // Sampled start event can't be before unrelated tasks ended.
      ...(eventType === 'start' ? unrelatedTasks.map(t => t.endTime) : []),
      // Sampled start event can't be before the other `E` events at its same timestamp.
      ...(eventType === 'start'
        ? allEventsAtTs.refined.filter(e => e.ph === 'E').map(e => e.ts)
        : [])
    );

    const maximumTs = Math.min(
      // Sampled event couldn't be later than this to begin with.
      timeRange.latestPossibleTimestamp,
      // Sampled start event can't be after its child started.
      // Sampled end event can't be after its parent ended.
      ...(eventType === 'start'
        ? childTasks.map(t => t.startTime)
        : parentTasks.map(t => t.endTime)),
      // Sampled end event can't be after unrelated tasks started.
      ...(eventType === 'start' ? [] : unrelatedTasks.map(t => t.startTime)),
      // Sampled end event can't be after the other `B` events at its same timestamp.
      // This is _currently_ only possible in contrived scenarios due to the sorted order of processing,
      // but it's a non-obvious observation and case to account for.
      ...(eventType === 'start'
        ? []
        : allEventsAtTs.refined.filter(e => e.ph === 'B').map(e => e.ts))
    );

    // We want to maximize the size of the sampling tasks within our constraints, so we'll pick
    // the _earliest_ possible time for start events and the _latest_ possible time for end events.
    const effectiveTimestamp =
      (eventType === 'start' && Number.isFinite(minimumTs)) || !Number.isFinite(maximumTs)
        ? minimumTs
        : maximumTs;

    return {timestamp: effectiveTimestamp, lastStartTimeIndex, lastEndTimeIndex};
  }

  /**
   * Creates the B/E-style trace events using only data from the profile itself. Each B/E event will
   * include the actual _range_ the timestamp could have been in its metadata that is used for
   * refinement later.
   *
   * @return {Array<SynthethicEvent>}
   */
  _synthesizeNaiveTraceEvents() {
    const profile = this._profile;
    const length = profile.samples.length;
    if (profile.timeDeltas.length !== length) throw new Error(`Invalid CPU profile length`);

    /** @type {Array<SynthethicEvent>} */
    const events = [];

    let currentProfilerTimestamp = profile.startTime;
    let earliestPossibleTimestamp = -Infinity;

    /** @type {Array<number>} */
    let lastActiveNodeIds = [];
    for (let i = 0; i < profile.samples.length; i++) {
      const nodeId = profile.samples[i];
      const timeDelta = Math.max(profile.timeDeltas[i], 1);
      const node = this._nodesById.get(nodeId);
      if (!node) throw new Error(`Missing node ${nodeId}`);

      currentProfilerTimestamp += timeDelta;

      const activeNodeIds = this._getActiveNodeIds(nodeId);
      events.push(
        ...this._synthesizeTraceEventsForTransition(
          earliestPossibleTimestamp,
          currentProfilerTimestamp,
          lastActiveNodeIds,
          activeNodeIds
        )
      );

      earliestPossibleTimestamp = currentProfilerTimestamp;
      lastActiveNodeIds = activeNodeIds;
    }

    events.push(
      ...this._synthesizeTraceEventsForTransition(
        currentProfilerTimestamp,
        Infinity,
        lastActiveNodeIds,
        []
      )
    );

    return events;
  }

  /**
   * Creates a copy of B/E-style trace events with refined timestamps using knowledge from the
   * tasks that have definitive timestamps.
   *
   * With the sampling profiler we know that a function started/ended _sometime between_ two points,
   * but not exactly when. Using the information from other tasks gives us more information to be
   * more precise with timings and allows us to create a valid task tree later on.
   *
   * @param {Array<{startTime: number, endTime: number}>} knownTasks
   * @param {Array<SynthethicTaskNode>} syntheticTasks
   * @param {Array<SynthethicEvent>} syntheticEvents
   * @return {Array<SynthethicEvent>}
   */
  _refineTraceEventsWithTasks(knownTasks, syntheticTasks, syntheticEvents) {
    /** @type {Array<SynthethicEvent>} */
    const refinedEvents = [];

    /** @type {Map<number, {naive: Array<SynthethicEvent>, refined: Array<SynthethicEvent>}>} */
    const syntheticEventsByTs = new Map();
    for (const event of syntheticEvents) {
      const group = syntheticEventsByTs.get(event.ts) || {naive: [], refined: []};
      group.naive.push(event);
      syntheticEventsByTs.set(event.ts, group);
    }

    /** @type {Map<SynthethicEvent, SynthethicTaskNode>} */
    const syntheticTasksByEvent = new Map();
    for (const task of syntheticTasks) {
      syntheticTasksByEvent.set(task.event, task);
      syntheticTasksByEvent.set(task.endEvent, task);
    }

    const knownTasksByStartTime = knownTasks.slice().sort((a, b) => a.startTime - b.startTime);
    const knownTasksByEndTime = knownTasks.slice().sort((a, b) => a.endTime - b.endTime);

    let knownTaskStartTimeIndex = 0;
    let knownTaskEndTimeIndex = 0;

    for (const event of syntheticEvents) {
      const syntheticTask = syntheticTasksByEvent.get(event);
      if (!syntheticTask) throw new Error('Impossible - all events have a task');
      const allEventsAtTs = syntheticEventsByTs.get(event.ts);
      if (!allEventsAtTs) throw new Error('Impossible - we just mapped every event');

      const effectiveTimestampData = CpuProfileModel._findEffectiveTimestamp({
        eventType: event.ph === 'B' ? 'start' : 'end',
        syntheticTask,
        allEventsAtTs,
        knownTaskStartTimeIndex,
        knownTaskEndTimeIndex,
        knownTasksByStartTime,
        knownTasksByEndTime,
      });

      knownTaskStartTimeIndex = effectiveTimestampData.lastStartTimeIndex;
      knownTaskEndTimeIndex = effectiveTimestampData.lastEndTimeIndex;

      const refinedEvent = {...event, ts: effectiveTimestampData.timestamp};
      refinedEvents.push(refinedEvent);
      allEventsAtTs.refined.push(refinedEvent);
    }

    return refinedEvents;
  }

  /**
   * Creates B/E-style trace events from a CpuProfile object created by `collectProfileEvents()`.
   * An optional set of tasks can be passed in to refine the start/end times.
   *
   * @param {Array<LH.Artifacts.TaskNode>} [knownTaskNodes]
   * @return {Array<LH.TraceEvent>}
   */
  synthesizeTraceEvents(knownTaskNodes = []) {
    const naiveEvents = this._synthesizeNaiveTraceEvents();
    if (!naiveEvents.length) return [];

    let finalEvents = naiveEvents;
    if (knownTaskNodes.length) {
      // If we have task information, put the times back into raw trace event ts scale.
      /** @type {(baseTs: number) => (node: LH.Artifacts.TaskNode) => LH.Artifacts.TaskNode} */
      const rebaseTaskTime = baseTs => node => ({
        ...node,
        startTime: baseTs + node.startTime * 1000,
        endTime: baseTs + node.endTime * 1000,
        duration: node.duration * 1000,
      });

      // The first task node might not be time 0, so recompute the baseTs.
      const baseTs = knownTaskNodes[0].event.ts - knownTaskNodes[0].startTime * 1000;
      const knownTasks = knownTaskNodes.map(rebaseTaskTime(baseTs));

      // We'll also create tasks for our naive events so we have the B/E pairs readily available.
      const naiveProfilerTasks = MainThreadTasks.getMainThreadTasks(naiveEvents, [], Infinity)
        .map(rebaseTaskTime(naiveEvents[0].ts))
        .filter(CpuProfileModel.isSyntheticTask);
      if (!naiveProfilerTasks.length) throw new Error('Failed to create naive profiler tasks');

      finalEvents = this._refineTraceEventsWithTasks(knownTasks, naiveProfilerTasks, naiveEvents);
    }

    return finalEvents;
  }

  /**
   * Creates B/E-style trace events from a CpuProfile object created by `collectProfileEvents()`
   *
   * @param {CpuProfile} profile
   * @param {Array<LH.Artifacts.TaskNode>} tasks
   * @return {Array<LH.TraceEvent>}
   */
  static synthesizeTraceEvents(profile, tasks) {
    const model = new CpuProfileModel(profile);
    return model.synthesizeTraceEvents(tasks);
  }

  /**
   * Merges the data of all the `ProfileChunk` trace events into a single CpuProfile object for consumption
   * by `synthesizeTraceEvents()`.
   *
   * @param {Array<LH.TraceEvent>} traceEvents
   * @return {Array<CpuProfile>}
   */
  static collectProfileEvents(traceEvents) {
    /** @type {Map<string, CpuProfile>} */
    const profiles = new Map();
    for (const event of traceEvents) {
      if (event.name !== 'Profile' && event.name !== 'ProfileChunk') continue;
      if (typeof event.id !== 'string') continue;

      // `Profile` or `ProfileChunk` can partially define these across multiple events.
      // We'll fallback to empty values and worry about validation in the `synthesizeTraceEvents` phase.
      const cpuProfileArg = event.args.data?.cpuProfile || {};
      const timeDeltas = event.args.data?.timeDeltas || cpuProfileArg.timeDeltas;
      let profile = profiles.get(event.id);

      if (event.name === 'Profile') {
        profile = {
          id: event.id,
          pid: event.pid,
          tid: event.tid,
          startTime: event.args.data?.startTime || event.ts,
          nodes: cpuProfileArg.nodes || [],
          samples: cpuProfileArg.samples || [],
          timeDeltas: timeDeltas || [],
        };
      } else {
        if (!profile) continue;
        profile.nodes.push(...(cpuProfileArg.nodes || []));
        profile.samples.push(...(cpuProfileArg.samples || []));
        profile.timeDeltas.push(...(timeDeltas || []));
      }

      profiles.set(profile.id, profile);
    }

    return Array.from(profiles.values());
  }
}

export {CpuProfileModel};
