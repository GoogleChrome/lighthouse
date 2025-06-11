/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Singluar helper to parse a raw trace and extract the most useful data for
 * various tools. This artifact will take a trace and then:
 *
 * 1. Find the TracingStartedInPage and navigationStart events of our intended tab & frame.
 * 2. Find the firstContentfulPaint and marked largestContentfulPaint events
 * 3. Isolate only the trace events from the tab's process (including all threads like compositor)
 *      * Sort those trace events in chronological order (as order isn't guaranteed)
 * 4. Return all those items in one handy bundle.
 */

/** @typedef {Omit<LH.Artifacts.NavigationTraceTimes, 'firstContentfulPaintAllFrames'|'traceEnd'>} TraceNavigationTimesForFrame */
/** @typedef {'lastNavigationStart'|'firstResourceSendRequest'|'lighthouseMarker'|'auto'} TimeOriginDeterminationMethod */
/** @typedef {Omit<LH.TraceEvent, 'name'|'args'> & {name: 'FrameCommittedInBrowser', args: {data: {frame: string, url: string, parent?: string}}}} FrameCommittedEvent */
/** @typedef {Omit<LH.TraceEvent, 'name'|'args'> & {name: 'largestContentfulPaint::Invalidate'|'largestContentfulPaint::Candidate', args: {data?: {size?: number}, frame: string}}} LCPEvent */
/** @typedef {Omit<LH.TraceEvent, 'name'|'args'> & {name: 'largestContentfulPaint::Candidate', args: {data: {size: number}, frame: string}}} LCPCandidateEvent */

import log from 'lighthouse-logger';

const ACCEPTABLE_NAVIGATION_URL_REGEX = /^(chrome|https?):/;

// The ideal input response latency, the time between the input task and the
// first frame of the response.
const BASE_RESPONSE_LATENCY = 16;
// COMPAT: m71+ We added RunTask to `disabled-by-default-lighthouse`
const SCHEDULABLE_TASK_TITLE_LH = 'RunTask';
// m69-70 DoWork is different and we now need RunTask, see https://bugs.chromium.org/p/chromium/issues/detail?id=871204#c11
const SCHEDULABLE_TASK_TITLE_ALT1 = 'ThreadControllerImpl::RunTask';
// In m66-68 refactored to this task title, https://crrev.com/c/883346
const SCHEDULABLE_TASK_TITLE_ALT2 = 'ThreadControllerImpl::DoWork';
// m65 and earlier
const SCHEDULABLE_TASK_TITLE_ALT3 = 'TaskQueueManager::ProcessTaskFromWorkQueue';

class TraceProcessor {
  static get TIMESPAN_MARKER_ID() {
    return '__lighthouseTimespanStart__';
  }

  /**
   * @return {Error}
   */
  static createNoNavstartError() {
    return new Error('No navigationStart event found');
  }

  /**
   * @return {Error}
   */
  static createNoResourceSendRequestError() {
    return new Error('No ResourceSendRequest event found');
  }

  /**
   * @return {Error}
   */
  static createNoTracingStartedError() {
    return new Error('No tracingStartedInBrowser event found');
  }

  /**
   * @return {Error}
   */
  static createNoFirstContentfulPaintError() {
    return new Error('No FirstContentfulPaint event found');
  }

  /**
   * @return {Error}
   */
  static createNoLighthouseMarkerError() {
    return new Error('No Lighthouse timespan marker event found');
  }

  /**
   * Returns true if the event is a navigation start event of a document whose URL seems valid.
   *
   * @param {LH.TraceEvent} event
   * @return {boolean}
   */
  static _isNavigationStartOfInterest(event) {
    if (event.name !== 'navigationStart') return false;
    // COMPAT: support pre-m67 test traces before `args.data` added to all navStart events.
    // TODO: remove next line when old test traces (e.g. progressive-app-m60.json) are updated.
    if (event.args.data?.documentLoaderURL === undefined) return true;
    if (!event.args.data?.documentLoaderURL) return false;
    return ACCEPTABLE_NAVIGATION_URL_REGEX.test(event.args.data.documentLoaderURL);
  }

  /**
   * This method sorts a group of trace events that have the same timestamp. We want to...
   *
   * 1. Put E events first, we finish off our existing events before we start new ones.
   * 2. Order B/X events by their duration, we want parents to start before child events.
   * 3. If we don't have any of this to go on, just use the position in the original array (stable sort).
   *
   * Note that the typical group size with the same timestamp will be quite small (<10 or so events),
   * and the number of groups typically ~1% of total trace, so the same ultra-performance-sensitive consideration
   * given to functions that run on entire traces does not necessarily apply here.
   *
   * @param {number[]} tsGroupIndices
   * @param {number[]} timestampSortedIndices
   * @param {number} indexOfTsGroupIndicesStart
   * @param {LH.TraceEvent[]} traceEvents
   * @return {number[]}
   */
  static _sortTimestampEventGroup(
      tsGroupIndices,
      timestampSortedIndices,
      indexOfTsGroupIndicesStart,
      traceEvents
  ) {
    /*
     * We have two different sets of indices going on here.

     *    1. There's the index for an element of `traceEvents`, referred to here as an `ArrayIndex`.
     *       `timestampSortedIndices` is an array of `ArrayIndex` elements.
     *    2. There's the index for an element of `timestampSortedIndices`, referred to here as a `TsIndex`.
     *       A `TsIndex` is therefore an index to an element which is itself an index.
     *
     * These two helper functions help resolve this layer of indirection.
     * Our final return value is an array of `ArrayIndex` in their final sort order.
     */
    /** @param {number} i */
    const lookupArrayIndexByTsIndex = i => timestampSortedIndices[i];
    /** @param {number} i */
    const lookupEventByTsIndex = i => traceEvents[lookupArrayIndexByTsIndex(i)];

    /** @type {Array<number>} */
    const eEventIndices = [];
    /** @type {Array<number>} */
    const bxEventIndices = [];
    /** @type {Array<number>} */
    const otherEventIndices = [];

    for (const tsIndex of tsGroupIndices) {
      // See comment above for the distinction between `tsIndex` and `arrayIndex`.
      const arrayIndex = lookupArrayIndexByTsIndex(tsIndex);
      const event = lookupEventByTsIndex(tsIndex);
      if (event.ph === 'E') eEventIndices.push(arrayIndex);
      else if (event.ph === 'X' || event.ph === 'B') bxEventIndices.push(arrayIndex);
      else otherEventIndices.push(arrayIndex);
    }

    /** @type {Map<number, number>} */
    const effectiveDuration = new Map();
    for (const index of bxEventIndices) {
      const event = traceEvents[index];
      if (event.ph === 'X') {
        effectiveDuration.set(index, event.dur);
      } else {
        // Find the next available 'E' event *after* the current group of events that matches our name, pid, and tid.
        let duration = Number.MAX_SAFE_INTEGER;
        // To find the next "available" 'E' event, we need to account for nested events of the same name.
        let additionalNestedEventsWithSameName = 0;
        const startIndex = indexOfTsGroupIndicesStart + tsGroupIndices.length;
        for (let j = startIndex; j < timestampSortedIndices.length; j++) {
          const potentialMatchingEvent = lookupEventByTsIndex(j);
          const eventMatches = potentialMatchingEvent.name === event.name &&
            potentialMatchingEvent.pid === event.pid &&
            potentialMatchingEvent.tid === event.tid;

          // The event doesn't match, just skip it.
          if (!eventMatches) continue;

          if (potentialMatchingEvent.ph === 'E' && additionalNestedEventsWithSameName === 0) {
            // It's the next available 'E' event for us, so set the duration and break the loop.
            duration = potentialMatchingEvent.ts - event.ts;
            break;
          } else if (potentialMatchingEvent.ph === 'E') {
            // It's an 'E' event but for a nested event. Decrement our counter and move on.
            additionalNestedEventsWithSameName--;
          } else if (potentialMatchingEvent.ph === 'B') {
            // It's a nested 'B' event. Increment our counter and move on.
            additionalNestedEventsWithSameName++;
          }
        }

        effectiveDuration.set(index, duration);
      }
    }

    bxEventIndices.sort((indexA, indexB) => ((effectiveDuration.get(indexB) || 0) -
      (effectiveDuration.get(indexA) || 0) || (indexA - indexB)));

    otherEventIndices.sort((indexA, indexB) => indexA - indexB);

    return [...eEventIndices, ...bxEventIndices, ...otherEventIndices];
  }

  /**
   * Sorts and filters trace events by timestamp and respecting the nesting structure inherent to
   * parent/child event relationships.
   *
   * @param {LH.TraceEvent[]} traceEvents
   * @param {(e: LH.TraceEvent) => boolean} filter
   */
  static filteredTraceSort(traceEvents, filter) {
    // create an array of the indices that we want to keep
    const indices = [];
    for (let srcIndex = 0; srcIndex < traceEvents.length; srcIndex++) {
      if (filter(traceEvents[srcIndex])) {
        indices.push(srcIndex);
      }
    }

    // Sort by ascending timestamp first.
    indices.sort((indexA, indexB) => traceEvents[indexA].ts - traceEvents[indexB].ts);

    // Now we find groups with equal timestamps and order them by their nesting structure.
    for (let i = 0; i < indices.length - 1; i++) {
      const ts = traceEvents[indices[i]].ts;
      const tsGroupIndices = [i];
      for (let j = i + 1; j < indices.length; j++) {
        if (traceEvents[indices[j]].ts !== ts) break;
        tsGroupIndices.push(j);
      }

      // We didn't find any other events with the same timestamp, just keep going.
      if (tsGroupIndices.length === 1) continue;

      // Sort the group by other criteria and replace our index array with it.
      const finalIndexOrder = TraceProcessor._sortTimestampEventGroup(
        tsGroupIndices,
        indices,
        i,
        traceEvents
      );
      indices.splice(i, finalIndexOrder.length, ...finalIndexOrder);
      // We just sorted this set of identical timestamps, so skip over the rest of the group.
      // -1 because we already have i++.
      i += tsGroupIndices.length - 1;
    }

    // create a new array using the target indices from previous sort step
    const sorted = [];
    for (let i = 0; i < indices.length; i++) {
      sorted.push(traceEvents[indices[i]]);
    }

    return sorted;
  }

  /**
   * There should *always* be at least one top level event, having 0 typically means something is
   * drastically wrong with the trace and we should just give up early and loudly.
   *
   * @param {LH.TraceEvent[]} events
   */
  static assertHasToplevelEvents(events) {
    const hasToplevelTask = events.some(this.isScheduleableTask);
    if (!hasToplevelTask) {
      throw new Error('Could not find any top level events');
    }
  }


  /**
   * Calculate duration at specified percentiles for given population of
   * durations.
   * If one of the durations overlaps the end of the window, the full
   * duration should be in the duration array, but the length not included
   * within the window should be given as `clippedLength`. For instance, if a
   * 50ms duration occurs 10ms before the end of the window, `50` should be in
   * the `durations` array, and `clippedLength` should be set to 40.
   * @see https://docs.google.com/document/d/1b9slyaB9yho91YTOkAQfpCdULFkZM9LqsipcX3t7He8/preview
   * @param {!Array<number>} durations Array of durations, sorted in ascending order.
   * @param {number} totalTime Total time (in ms) of interval containing durations.
   * @param {!Array<number>} percentiles Array of percentiles of interest, in ascending order.
   * @param {number=} clippedLength Optional length clipped from a duration overlapping end of window. Default of 0.
   * @return {!Array<{percentile: number, time: number}>}
   * @private
   */
  static _riskPercentiles(durations, totalTime, percentiles, clippedLength = 0) {
    let busyTime = 0;
    for (let i = 0; i < durations.length; i++) {
      busyTime += durations[i];
    }
    busyTime -= clippedLength;

    // Start with idle time already complete.
    let completedTime = totalTime - busyTime;
    let duration = 0;
    let cdfTime = completedTime;
    const results = [];

    let durationIndex = -1;
    let remainingCount = durations.length + 1;
    if (clippedLength > 0) {
      // If there was a clipped duration, one less in count since one hasn't started yet.
      remainingCount--;
    }

    // Find percentiles of interest, in order.
    for (const percentile of percentiles) {
      // Loop over durations, calculating a CDF value for each until it is above
      // the target percentile.
      const percentileTime = percentile * totalTime;
      while (cdfTime < percentileTime && durationIndex < durations.length - 1) {
        completedTime += duration;
        remainingCount -= (duration < 0 ? -1 : 1);

        if (clippedLength > 0 && clippedLength < durations[durationIndex + 1]) {
          duration = -clippedLength;
          clippedLength = 0;
        } else {
          durationIndex++;
          duration = durations[durationIndex];
        }

        // Calculate value of CDF (multiplied by totalTime) for the end of this duration.
        cdfTime = completedTime + Math.abs(duration) * remainingCount;
      }

      // Negative results are within idle time (0ms wait by definition), so clamp at zero.
      results.push({
        percentile,
        time: Math.max(0, (percentileTime - completedTime) / remainingCount) +
          BASE_RESPONSE_LATENCY,
      });
    }

    return results;
  }

  /**
   * Calculates the maximum queueing time (in ms) of high priority tasks for
   * selected percentiles within a window of the main thread.
   * @see https://docs.google.com/document/d/1b9slyaB9yho91YTOkAQfpCdULFkZM9LqsipcX3t7He8/preview
   * @param {Array<ToplevelEvent>} events
   * @param {number} startTime Start time (in ms relative to timeOrigin) of range of interest.
   * @param {number} endTime End time (in ms relative to timeOrigin) of range of interest.
   * @param {!Array<number>=} percentiles Optional array of percentiles to compute. Defaults to [0.5, 0.75, 0.9, 0.99, 1].
   * @return {!Array<{percentile: number, time: number}>}
   */
  static getRiskToResponsiveness(
      events,
      startTime,
      endTime,
      percentiles = [0.5, 0.75, 0.9, 0.99, 1]
  ) {
    const totalTime = endTime - startTime;
    percentiles.sort((a, b) => a - b);

    const ret = this.getMainThreadTopLevelEventDurations(events, startTime, endTime);
    return this._riskPercentiles(ret.durations, totalTime, percentiles,
        ret.clippedLength);
  }

  /**
   * Provides durations in ms of all main thread top-level events
   * @param {Array<ToplevelEvent>} topLevelEvents
   * @param {number} startTime Optional start time (in ms relative to timeOrigin) of range of interest. Defaults to 0.
   * @param {number} endTime Optional end time (in ms relative to timeOrigin) of range of interest. Defaults to trace end.
   * @return {{durations: Array<number>, clippedLength: number}}
   */
  static getMainThreadTopLevelEventDurations(topLevelEvents, startTime = 0, endTime = Infinity) {
    // Find durations of all slices in range of interest.
    /** @type {Array<number>} */
    const durations = [];
    let clippedLength = 0;

    for (const event of topLevelEvents) {
      if (event.end < startTime || event.start > endTime) {
        continue;
      }

      let duration = event.duration;
      let eventStart = event.start;
      if (eventStart < startTime) {
        // Any part of task before window can be discarded.
        eventStart = startTime;
        duration = event.end - startTime;
      }

      if (event.end > endTime) {
        // Any part of task after window must be clipped but accounted for.
        clippedLength = duration - (endTime - eventStart);
      }

      durations.push(duration);
    }
    durations.sort((a, b) => a - b);

    return {
      durations,
      clippedLength,
    };
  }

  /**
   * Provides the top level events on the main thread with timestamps in ms relative to timeOrigin.
   * start.
   * @param {LH.Artifacts.ProcessedTrace} trace
   * @param {number=} startTime Optional start time (in ms relative to timeOrigin) of range of interest. Defaults to 0.
   * @param {number=} endTime Optional end time (in ms relative to timeOrigin) of range of interest. Defaults to trace end.
   * @return {Array<ToplevelEvent>}
   */
  static getMainThreadTopLevelEvents(trace, startTime = 0, endTime = Infinity) {
    const topLevelEvents = [];
    /** @type {ToplevelEvent|undefined} */
    let prevToplevel = undefined;

    // note: mainThreadEvents is already sorted by event start
    for (const event of trace.mainThreadEvents) {
      if (!this.isScheduleableTask(event) || !event.dur) continue;

      const start = (event.ts - trace.timeOriginEvt.ts) / 1000;
      const end = (event.ts + event.dur - trace.timeOriginEvt.ts) / 1000;
      if (start > endTime || end < startTime) continue;

      // Temporary fix for a Chrome bug where some RunTask events can be overlapping.
      // We correct that here be ensuring each RunTask ends at least 1 microsecond before the next
      // https://github.com/GoogleChrome/lighthouse/issues/15896
      // https://issues.chromium.org/issues/329678173
      if (prevToplevel && start < prevToplevel.end) {
        prevToplevel.end = start - 0.001;
      }

      prevToplevel = {
        start,
        end,
        duration: event.dur / 1000,
      };

      topLevelEvents.push(prevToplevel);
    }

    return topLevelEvents;
  }

  /**
   * @param {LH.TraceEvent[]} events
   * @return {{startingPid: number, frameId: string}}
   */
  static findMainFrameIds(events) {
    // Prefer the newer TracingStartedInBrowser event first, if it exists
    const startedInBrowserEvt = events.find(e => e.name === 'TracingStartedInBrowser');
    if (startedInBrowserEvt?.args.data?.frames) {
      const mainFrame = startedInBrowserEvt.args.data.frames.find(frame => !frame.parent);
      const frameId = mainFrame?.frame;
      const pid = mainFrame?.processId;

      if (pid && frameId) {
        return {
          startingPid: pid,
          frameId,
        };
      }
    }

    // Support legacy browser versions that do not emit TracingStartedInBrowser event.
    // The first TracingStartedInPage in the trace is definitely our renderer thread of interest
    // Beware: the tracingStartedInPage event can appear slightly after a navigationStart
    const startedInPageEvt = events.find(e => e.name === 'TracingStartedInPage');
    if (startedInPageEvt?.args?.data) {
      const frameId = startedInPageEvt.args.data.page;
      if (frameId) {
        return {
          startingPid: startedInPageEvt.pid,
          frameId,
        };
      }
    }

    // Support the case where everything else fails, see https://github.com/GoogleChrome/lighthouse/issues/7118.
    // If we can't find either TracingStarted event, then we'll fallback to the first navStart that
    // looks like it was loading the main frame with a real URL. Because the schema for this event
    // has changed across Chrome versions, we'll be extra defensive about finding this case.
    const navStartEvt = events.find(e =>
      this._isNavigationStartOfInterest(e) && e.args.data?.isLoadingMainFrame
    );
    // Find the first resource that was requested and make sure it agrees on the id.
    const firstResourceSendEvt = events.find(e => e.name === 'ResourceSendRequest');
    // We know that these properties exist if we found the events, but TSC doesn't.
    if (navStartEvt?.args?.data &&
        firstResourceSendEvt &&
        firstResourceSendEvt.pid === navStartEvt.pid &&
        firstResourceSendEvt.tid === navStartEvt.tid) {
      const frameId = navStartEvt.args.frame;
      if (frameId) {
        return {
          startingPid: navStartEvt.pid,
          frameId,
        };
      }
    }

    throw this.createNoTracingStartedError();
  }

  /**
   * If there were any cross-origin navigations, there'll be more than one pid returned
   * @param {{startingPid: number, frameId: string}} mainFrameInfo
   * @param {LH.TraceEvent[]} keyEvents
   * @return {Map<number, number>} Map where keys are process IDs and their values are thread IDs
   */
  static findMainFramePidTids(mainFrameInfo, keyEvents) {
    const frameProcessEvts = keyEvents.filter(evt =>
      // ProcessReadyInBrowser is used when a processID isn't available when the FrameCommittedInBrowser trace event is emitted.
      // In that case. FrameCommittedInBrowser has no processId, but a processPseudoId. and the ProcessReadyInBrowser event declares the proper processId.
      (evt.name === 'FrameCommittedInBrowser' || evt.name === 'ProcessReadyInBrowser') &&
      evt.args?.data?.frame === mainFrameInfo.frameId &&
      evt?.args?.data?.processId
    );

    // "Modern" traces with a navigation have a FrameCommittedInBrowser event
    const mainFramePids = frameProcessEvts.length
      ? frameProcessEvts.map(e => e?.args?.data?.processId)
      // …But old traces and some timespan traces may not. In these situations, we'll assume the
      // primary process ID remains constant (as there were no navigations).
      : [mainFrameInfo.startingPid];

    const pidToTid = new Map();

    for (const pid of new Set(mainFramePids)) {
      const threadEvents = keyEvents.filter(e =>
        e.cat === '__metadata' &&
        e.pid === pid &&
        e.ph === 'M' &&
        e.name === 'thread_name'
      );

      // While renderer tids are generally predictable, we'll doublecheck it
      let threadNameEvt = threadEvents.find(e => e.args.name === 'CrRendererMain');

      // `CrRendererMain` can be missing if chrome is launched with the `--single-process` flag.
      // In this case, page tasks will be run in the browser thread.
      if (!threadNameEvt) {
        threadNameEvt = threadEvents.find(e => e.args.name === 'CrBrowserMain');
      }

      const tid = threadNameEvt?.tid;

      if (!tid) {
        throw new Error('Unable to determine tid for renderer process');
      }

      pidToTid.set(pid, tid);
    }
    return pidToTid;
  }

  /**
   * @param {LH.TraceEvent} evt
   * @return {boolean}
   */
  static isScheduleableTask(evt) {
    return evt.name === SCHEDULABLE_TASK_TITLE_LH ||
    evt.name === SCHEDULABLE_TASK_TITLE_ALT1 ||
    evt.name === SCHEDULABLE_TASK_TITLE_ALT2 ||
    evt.name === SCHEDULABLE_TASK_TITLE_ALT3;
  }

  /**
   * @param {LH.TraceEvent} evt
   * @return {evt is LCPEvent}
   */
  static isLCPEvent(evt) {
    if (evt.name !== 'largestContentfulPaint::Invalidate' &&
        evt.name !== 'largestContentfulPaint::Candidate') return false;
    return Boolean(evt.args?.frame);
  }

  /**
   * @param {LH.TraceEvent} evt
   * @return {evt is LCPCandidateEvent}
   */
  static isLCPCandidateEvent(evt) {
    return Boolean(
      evt.name === 'largestContentfulPaint::Candidate' &&
      evt.args?.frame &&
      evt.args.data &&
      evt.args.data.size !== undefined
    );
  }

  /**
   * The associated frame ID is set in different locations for different trace events.
   * This function checks all known locations for the frame ID and returns `undefined` if it's not found.
   *
   * @param {LH.TraceEvent} evt
   * @return {string|undefined}
   */
  static getFrameId(evt) {
    return evt.args?.data?.frame ||
      evt.args.data?.frameID ||
      evt.args.frame;
  }

  /**
   * Returns the maximum LCP event across all frames in `events`.
   * Sets `invalidated` flag if LCP of every frame is invalidated.
   *
   * LCP's trace event was first introduced in m78. We can't surface an LCP for older Chrome versions.
   * LCP comes from a frame's latest `largestContentfulPaint::Candidate`, but it can be invalidated by a `largestContentfulPaint::Invalidate` event.
   *
   * @param {LH.TraceEvent[]} events
   * @param {LH.TraceEvent} timeOriginEvent
   * @return {{lcp: LCPEvent | undefined, invalidated: boolean}}
   */
  static computeValidLCPAllFrames(events, timeOriginEvent) {
    const lcpEvents = events.filter(this.isLCPEvent).reverse();

    /** @type {Map<string, LCPEvent>} */
    const finalLcpEventsByFrame = new Map();
    for (const e of lcpEvents) {
      if (e.ts <= timeOriginEvent.ts) break;

      // Already found final LCP state of this frame.
      const frame = e.args.frame;
      if (finalLcpEventsByFrame.has(frame)) continue;

      finalLcpEventsByFrame.set(frame, e);
    }

    /** @type {LCPCandidateEvent | undefined} */
    let maxLcpAcrossFrames;
    for (const lcp of finalLcpEventsByFrame.values()) {
      if (!this.isLCPCandidateEvent(lcp)) continue;
      if (!maxLcpAcrossFrames || lcp.args.data.size > maxLcpAcrossFrames.args.data.size) {
        maxLcpAcrossFrames = lcp;
      }
    }

    return {
      lcp: maxLcpAcrossFrames,
      // LCP events were found, but final LCP event of every frame was an invalidate event.
      invalidated: Boolean(!maxLcpAcrossFrames && finalLcpEventsByFrame.size),
    };
  }

  /**
   * @param {Array<{id: string, url: string, parent?: string}>} frames
   * @return {Map<string, string>}
   */
  static resolveRootFrames(frames) {
    /** @type {Map<string, string>} */
    const parentFrames = new Map();
    for (const frame of frames) {
      if (!frame.parent) continue;
      parentFrames.set(frame.id, frame.parent);
    }

    /** @type {Map<string, string>} */
    const frameIdToRootFrameId = new Map();
    for (const frame of frames) {
      let cur = frame.id;
      while (parentFrames.has(cur)) {
        cur = /** @type {string} */ (parentFrames.get(cur));
      }
      if (cur === undefined) {
        throw new Error('Unexpected undefined frameId');
      }
      frameIdToRootFrameId.set(frame.id, cur);
    }

    return frameIdToRootFrameId;
  }

  /**
   * Finds key trace events, identifies main process/thread, and returns timings of trace events
   * in milliseconds since the time origin in addition to the standard microsecond monotonic timestamps.
   * @param {LH.Trace} trace
   * @param {{timeOriginDeterminationMethod?: TimeOriginDeterminationMethod}} [options]
   * @return {LH.Artifacts.ProcessedTrace}
  */
  static processTrace(trace, options) {
    const {timeOriginDeterminationMethod = 'auto'} = options || {};

    // Parse the trace for our key events and sort them by timestamp. Note: sort
    // *must* be stable to keep events correctly nested.
    const keyEvents = this.filteredTraceSort(trace.traceEvents, e => {
      return e.cat.includes('blink.user_timing') ||
          e.cat.includes('loading') ||
          e.cat.includes('devtools.timeline') ||
          e.cat === '__metadata';
    });

    // Find the inspected frame
    const mainFrameInfo = this.findMainFrameIds(keyEvents);
    const rendererPidToTid = this.findMainFramePidTids(mainFrameInfo, keyEvents);

    // Subset all trace events to just our tab's process (incl threads other than main)
    // stable-sort events to keep them correctly nested.
    const processEvents = TraceProcessor
      .filteredTraceSort(trace.traceEvents, e => rendererPidToTid.has(e.pid));

    // TODO(paulirish): filter down frames (and subsequent actions) to the primary process tree & frame tree

    /** @type {Map<string, {id: string, url: string, parent?: string}>} */
    const framesById = new Map();

    // Begin collection of frame tree information with TracingStartedInBrowser,
    // which should be present even without navigations.
    const tracingStartedFrames = keyEvents
        .find(e => e.name === 'TracingStartedInBrowser')?.args?.data?.frames;
    if (tracingStartedFrames) {
      for (const frame of tracingStartedFrames) {
        framesById.set(frame.frame, {
          id: frame.frame,
          url: frame.url,
          parent: frame.parent,
        });
      }
    }

    // Update known frames if FrameCommittedInBrowser events come in, typically
    // with updated `url`, as well as pid, etc. Some traces (like timespans) may
    // not have any committed frames.
    keyEvents
      .filter(/** @return {evt is FrameCommittedEvent} */ evt => {
        return Boolean(
          evt.name === 'FrameCommittedInBrowser' &&
          evt.args.data?.frame &&
          evt.args.data.url !== undefined
        );
      }).forEach(evt => {
        framesById.set(evt.args.data.frame, {
          id: evt.args.data.frame,
          url: evt.args.data.url,
          parent: evt.args.data.parent,
        });
      });

    const frames = [...framesById.values()];
    const frameIdToRootFrameId = this.resolveRootFrames(frames);

    const inspectedTreeFrameIds = [...frameIdToRootFrameId.entries()]
      .filter(([, rootFrameId]) => rootFrameId === mainFrameInfo.frameId)
      .map(([child]) => child);

    // Filter to just events matching the main frame ID, just to make sure.
    /** @param {LH.TraceEvent} e */
    function associatedToMainFrame(e) {
      const frameId = TraceProcessor.getFrameId(e);
      return frameId === mainFrameInfo.frameId;
    }

    /** @param {LH.TraceEvent} e */
    function associatedToAllFrames(e) {
      const frameId = TraceProcessor.getFrameId(e);
      return frameId ? inspectedTreeFrameIds.includes(frameId) : false;
    }
    const frameEvents = keyEvents.filter(e => associatedToMainFrame(e));

    // Filter to just events matching the main frame ID or any child frame IDs. The subframes
    // are either in-process (same origin) or, potentially, out-of-process. (OOPIFs)
    let frameTreeEvents = [];
    if (frameIdToRootFrameId.has(mainFrameInfo.frameId)) {
      frameTreeEvents = keyEvents.filter(e => associatedToAllFrames(e));
    } else {
      // In practice, there should always be TracingStartedInBrowser/FrameCommittedInBrowser events to
      // define the frame tree. Unfortunately, many test traces do not that frame info due to minification.
      // This ensures there is always a minimal frame tree and events so those tests don't fail.
      log.warn(
        'TraceProcessor',
        'frameTreeEvents may be incomplete, make sure the trace has frame events'
      );
      frameIdToRootFrameId.set(mainFrameInfo.frameId, mainFrameInfo.frameId);
      frameTreeEvents = frameEvents;
    }

    // Compute our time origin to use for all relative timings.
    const timeOriginEvt = this.computeTimeOrigin(
      {keyEvents, frameEvents, mainFrameInfo: mainFrameInfo},
      timeOriginDeterminationMethod
    );

    const mainThreadEvents = processEvents.filter(e => e.tid === rendererPidToTid.get(e.pid));

    // Ensure our traceEnd reflects all page activity.
    const traceEnd = this.computeTraceEnd(trace.traceEvents, timeOriginEvt);

    // This could be much more concise with object spread, but the consensus is that explicitness is
    // preferred over brevity here.
    return {
      frames,
      mainThreadEvents,
      frameEvents,
      frameTreeEvents,
      processEvents,
      mainFrameInfo,
      timeOriginEvt,
      timings: {
        timeOrigin: 0,
        traceEnd: traceEnd.timing,
      },
      timestamps: {
        timeOrigin: timeOriginEvt.ts,
        traceEnd: traceEnd.timestamp,
      },
      _keyEvents: keyEvents,
      _rendererPidToTid: rendererPidToTid,
    };
  }

  /**
   * Finds key navigation trace events and computes timings of events in milliseconds since the time
   * origin in addition to the standard microsecond monotonic timestamps.
   * @param {LH.Artifacts.ProcessedTrace} processedTrace
   * @return {LH.Artifacts.ProcessedNavigation}
  */
  static processNavigation(processedTrace) {
    const {frameEvents, frameTreeEvents, timeOriginEvt, timings, timestamps} = processedTrace;

    // Compute the key frame timings for the main frame.
    const frameTimings = this.computeNavigationTimingsForFrame(frameEvents, {timeOriginEvt});

    // Compute FCP for all frames.
    const fcpAllFramesEvt = frameTreeEvents.find(
      e => e.name === 'firstContentfulPaint' && e.ts > timeOriginEvt.ts
    );

    if (!fcpAllFramesEvt) {
      throw this.createNoFirstContentfulPaintError();
    }

    // Compute LCP for all frames.
    const lcpAllFramesEvt = this.computeValidLCPAllFrames(frameTreeEvents, timeOriginEvt).lcp;

    /** @param {number} ts */
    const getTiming = ts => (ts - timeOriginEvt.ts) / 1000;
    /** @param {number=} ts */
    const maybeGetTiming = (ts) => ts === undefined ? undefined : getTiming(ts);

    return {
      timings: {
        timeOrigin: timings.timeOrigin,
        firstPaint: frameTimings.timings.firstPaint,
        firstContentfulPaint: frameTimings.timings.firstContentfulPaint,
        firstContentfulPaintAllFrames: getTiming(fcpAllFramesEvt.ts),
        largestContentfulPaint: frameTimings.timings.largestContentfulPaint,
        largestContentfulPaintAllFrames: maybeGetTiming(lcpAllFramesEvt?.ts),
        load: frameTimings.timings.load,
        domContentLoaded: frameTimings.timings.domContentLoaded,
        traceEnd: timings.traceEnd,
      },
      timestamps: {
        timeOrigin: timestamps.timeOrigin,
        firstPaint: frameTimings.timestamps.firstPaint,
        firstContentfulPaint: frameTimings.timestamps.firstContentfulPaint,
        firstContentfulPaintAllFrames: fcpAllFramesEvt.ts,
        largestContentfulPaint: frameTimings.timestamps.largestContentfulPaint,
        largestContentfulPaintAllFrames: lcpAllFramesEvt?.ts,
        load: frameTimings.timestamps.load,
        domContentLoaded: frameTimings.timestamps.domContentLoaded,
        traceEnd: timestamps.traceEnd,
      },
      firstPaintEvt: frameTimings.firstPaintEvt,
      firstContentfulPaintEvt: frameTimings.firstContentfulPaintEvt,
      firstContentfulPaintAllFramesEvt: fcpAllFramesEvt,
      largestContentfulPaintEvt: frameTimings.largestContentfulPaintEvt,
      largestContentfulPaintAllFramesEvt: lcpAllFramesEvt,
      loadEvt: frameTimings.loadEvt,
      domContentLoadedEvt: frameTimings.domContentLoadedEvt,
      lcpInvalidated: frameTimings.lcpInvalidated,
    };
  }

  /**
   * Computes the last observable timestamp in a set of trace events.
   *
   * @param {Array<LH.TraceEvent>} events
   * @param {LH.TraceEvent} timeOriginEvt
   * @return {{timing: number, timestamp: number}}
   */
  static computeTraceEnd(events, timeOriginEvt) {
    let maxTs = -Infinity;
    for (const event of events) {
      maxTs = Math.max(event.ts + (event.dur || 0), maxTs);
    }

    return {timestamp: maxTs, timing: (maxTs - timeOriginEvt.ts) / 1000};
  }

  /**
   * Computes the time origin using the specified method.
   *
   *    - firstResourceSendRequest
   *      Uses the time that the very first network request is sent in the main frame.
   *      Eventually should be used in place of lastNavigationStart as the default for navigations.
   *      This method includes the cost of all redirects when evaluating a navigation (which matches lantern behavior).
   *      The only difference between firstResourceSendRequest and the first `navigationStart` is
   *      the unload time of `about:blank` (which is a Lighthouse implementation detail and shouldn't be included).
   *
   *    - lastNavigationStart
   *      Uses the time of the last `navigationStart` event in the main frame.
   *      The historical time origin of Lighthouse from 2016-Present.
   *      This method excludes the cost of client-side redirects when evaluating a navigation.
   *      Can also be skewed by several hundred milliseconds or even seconds when the browser takes a long
   *      time to unload `about:blank`.
   *
   * @param {{keyEvents: Array<LH.TraceEvent>, frameEvents: Array<LH.TraceEvent>, mainFrameInfo: {frameId: string}}} traceEventSubsets
   * @param {TimeOriginDeterminationMethod} method
   * @return {LH.TraceEvent}
   */
  static computeTimeOrigin(traceEventSubsets, method) {
    const lastNavigationStart = () => {
      // Our time origin will be the last frame navigation in the trace
      const frameEvents = traceEventSubsets.frameEvents;
      return frameEvents.filter(this._isNavigationStartOfInterest).pop();
    };

    const lighthouseMarker = () => {
      const frameEvents = traceEventSubsets.keyEvents;
      return frameEvents.find(
        evt =>
          evt.name === 'clock_sync' &&
          evt.args.sync_id === TraceProcessor.TIMESPAN_MARKER_ID
      );
    };

    switch (method) {
      case 'firstResourceSendRequest': {
        // Our time origin will be the timestamp of the first request that's sent in the frame.
        const fetchStart = traceEventSubsets.keyEvents.find(event => {
          if (event.name !== 'ResourceSendRequest') return false;
          const data = event.args.data || {};
          return data.frame === traceEventSubsets.mainFrameInfo.frameId;
        });
        if (!fetchStart) throw this.createNoResourceSendRequestError();
        return fetchStart;
      }
      case 'lastNavigationStart': {
        const navigationStart = lastNavigationStart();
        if (!navigationStart) throw this.createNoNavstartError();
        return navigationStart;
      }
      case 'lighthouseMarker': {
        const marker = lighthouseMarker();
        if (!marker) throw this.createNoLighthouseMarkerError();
        return marker;
      }
      case 'auto': {
        const marker = lighthouseMarker() || lastNavigationStart();
        if (!marker) throw this.createNoNavstartError();
        return marker;
      }
    }
  }

  /**
   * Computes timings of trace events of key trace events in milliseconds since the time origin
   * in addition to the standard microsecond monotonic timestamps.
   * @param {Array<LH.TraceEvent>} frameEvents
   * @param {{timeOriginEvt: LH.TraceEvent}} options
  */
  static computeNavigationTimingsForFrame(frameEvents, options) {
    const {timeOriginEvt} = options;

    // Find our first paint of this frame
    const firstPaint = frameEvents.find(e => e.name === 'firstPaint' && e.ts > timeOriginEvt.ts);

    // FCP will follow at/after the FP. Used in so many places we require it.
    const firstContentfulPaint = frameEvents.find(
      e => e.name === 'firstContentfulPaint' && e.ts > timeOriginEvt.ts
    );

    if (!firstContentfulPaint) {
      throw this.createNoFirstContentfulPaintError();
    }

    // This function accepts events spanning multiple frames, but this usage will only provide events from the main frame.
    const lcpResult = this.computeValidLCPAllFrames(frameEvents, timeOriginEvt);

    const load = frameEvents.find(e => e.name === 'loadEventEnd' && e.ts > timeOriginEvt.ts);
    const domContentLoaded = frameEvents.find(
      e => e.name === 'domContentLoadedEventEnd' && e.ts > timeOriginEvt.ts
    );

    /** @param {{ts: number}=} event */
    const getTimestamp = (event) => event?.ts;
    /** @type {TraceNavigationTimesForFrame} */
    const timestamps = {
      timeOrigin: timeOriginEvt.ts,
      firstPaint: getTimestamp(firstPaint),
      firstContentfulPaint: firstContentfulPaint.ts,
      largestContentfulPaint: getTimestamp(lcpResult.lcp),
      load: getTimestamp(load),
      domContentLoaded: getTimestamp(domContentLoaded),
    };

    /** @param {number} ts */
    const getTiming = ts => (ts - timeOriginEvt.ts) / 1000;
    /** @param {number=} ts */
    const maybeGetTiming = (ts) => ts === undefined ? undefined : getTiming(ts);
    /** @type {TraceNavigationTimesForFrame} */
    const timings = {
      timeOrigin: 0,
      firstPaint: maybeGetTiming(timestamps.firstPaint),
      firstContentfulPaint: getTiming(timestamps.firstContentfulPaint),
      largestContentfulPaint: maybeGetTiming(timestamps.largestContentfulPaint),
      load: maybeGetTiming(timestamps.load),
      domContentLoaded: maybeGetTiming(timestamps.domContentLoaded),
    };

    return {
      timings,
      timestamps,
      timeOriginEvt: timeOriginEvt,
      firstPaintEvt: firstPaint,
      firstContentfulPaintEvt: firstContentfulPaint,
      largestContentfulPaintEvt: lcpResult.lcp,
      loadEvt: load,
      domContentLoadedEvt: domContentLoaded,
      lcpInvalidated: lcpResult.invalidated,
    };
  }
}

export {TraceProcessor};

/**
 * @typedef ToplevelEvent
 * @prop {number} start
 * @prop {number} end
 * @prop {number} duration
 */
