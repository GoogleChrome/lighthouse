/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Singluar helper to parse a raw trace and extract the most useful data for
 * various tools. This artifact will take a trace and then:
 *
 * 1. Find the TracingStartedInPage and navigationStart events of our intended tab & frame.
 * 2. Find the firstContentfulPaint and marked firstMeaningfulPaint events
 * 3. Isolate only the trace events from the tab's process (including all threads like compositor)
 *      * Sort those trace events in chronological order (as order isn't guaranteed)
 * 4. Return all those items in one handy bundle.
 */

/** @typedef {Omit<LH.Artifacts.TraceTimes, 'firstContentfulPaint'> & {firstContentfulPaint?: number}} TraceTimesWithoutFCP */
/** @typedef {Omit<LH.Artifacts.TraceOfTab, 'firstContentfulPaintEvt'|'timings'|'timestamps'> & {timings: TraceTimesWithoutFCP, timestamps: TraceTimesWithoutFCP, firstContentfulPaintEvt?: LH.Artifacts.TraceOfTab['firstContentfulPaintEvt']}} TraceOfTabWithoutFCP */

const log = require('lighthouse-logger');

const ACCEPTABLE_NAVIGATION_URL_REGEX = /^(chrome|https?):/;

// The ideal input response latency, the time between the input task and the
// first frame of the response.
const BASE_RESPONSE_LATENCY = 16;
// m71+ We added RunTask to `disabled-by-default-lighthouse`
const SCHEDULABLE_TASK_TITLE_LH = 'RunTask';
// m69-70 DoWork is different and we now need RunTask, see https://bugs.chromium.org/p/chromium/issues/detail?id=871204#c11
const SCHEDULABLE_TASK_TITLE_ALT1 = 'ThreadControllerImpl::RunTask';
// In m66-68 refactored to this task title, https://crrev.com/c/883346
const SCHEDULABLE_TASK_TITLE_ALT2 = 'ThreadControllerImpl::DoWork';
// m65 and earlier
const SCHEDULABLE_TASK_TITLE_ALT3 = 'TaskQueueManager::ProcessTaskFromWorkQueue';

class TraceProcessor {
  /**
   * @return {Error}
   */
  static createNoNavstartError() {
    return new Error('No navigationStart event found');
  }

  /**
   * @return {Error}
   */
  static createNoTracingStartedError() {
    return new Error('No tracingStartedInBrowser event found');
  }

  /**
   * Returns true if the event is a navigation start event of a document whose URL seems valid.
   *
   * @param {LH.TraceEvent} event
   */
  static _isNavigationStartOfInterest(event) {
    return event.name === 'navigationStart' &&
      (!event.args.data || !event.args.data.documentLoaderURL ||
        ACCEPTABLE_NAVIGATION_URL_REGEX.test(event.args.data.documentLoaderURL));
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
   * @param {number} startTime Start time (in ms relative to navstart) of range of interest.
   * @param {number} endTime End time (in ms relative to navstart) of range of interest.
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
   * @param {number} startTime Optional start time (in ms relative to navstart) of range of interest. Defaults to navstart.
   * @param {number} endTime Optional end time (in ms relative to navstart) of range of interest. Defaults to trace end.
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
   * Provides the top level events on the main thread with timestamps in ms relative to navigation
   * start.
   * @param {LH.Artifacts.TraceOfTab} tabTrace
   * @param {number=} startTime Optional start time (in ms relative to navstart) of range of interest. Defaults to navstart.
   * @param {number=} endTime Optional end time (in ms relative to navstart) of range of interest. Defaults to trace end.
   * @return {Array<ToplevelEvent>}
   */
  static getMainThreadTopLevelEvents(tabTrace, startTime = 0, endTime = Infinity) {
    const topLevelEvents = [];
    // note: mainThreadEvents is already sorted by event start
    for (const event of tabTrace.mainThreadEvents) {
      if (!this.isScheduleableTask(event) || !event.dur) continue;

      const start = (event.ts - tabTrace.navigationStartEvt.ts) / 1000;
      const end = (event.ts + event.dur - tabTrace.navigationStartEvt.ts) / 1000;
      if (start > endTime || end < startTime) continue;

      topLevelEvents.push({
        start,
        end,
        duration: event.dur / 1000,
      });
    }

    return topLevelEvents;
  }

  /**
   * @param {LH.TraceEvent[]} events
   * @return {{pid: number, tid: number, frameId: string}}
   */
  static findMainFrameIds(events) {
    // Prefer the newer TracingStartedInBrowser event first, if it exists
    const startedInBrowserEvt = events.find(e => e.name === 'TracingStartedInBrowser');
    if (startedInBrowserEvt && startedInBrowserEvt.args.data &&
        startedInBrowserEvt.args.data.frames) {
      const mainFrame = startedInBrowserEvt.args.data.frames.find(frame => !frame.parent);
      const frameId = mainFrame && mainFrame.frame;
      const pid = mainFrame && mainFrame.processId;

      const threadNameEvt = events.find(e => e.pid === pid && e.ph === 'M' &&
        e.cat === '__metadata' && e.name === 'thread_name' && e.args.name === 'CrRendererMain');
      const tid = threadNameEvt && threadNameEvt.tid;

      if (pid && tid && frameId) {
        return {
          pid,
          tid,
          frameId,
        };
      }
    }

    // Support legacy browser versions that do not emit TracingStartedInBrowser event.
    // The first TracingStartedInPage in the trace is definitely our renderer thread of interest
    // Beware: the tracingStartedInPage event can appear slightly after a navigationStart
    const startedInPageEvt = events.find(e => e.name === 'TracingStartedInPage');
    if (startedInPageEvt && startedInPageEvt.args && startedInPageEvt.args.data) {
      const frameId = startedInPageEvt.args.data.page;
      if (frameId) {
        return {
          pid: startedInPageEvt.pid,
          tid: startedInPageEvt.tid,
          frameId,
        };
      }
    }

    // Support the case where everything else fails, see https://github.com/GoogleChrome/lighthouse/issues/7118.
    // If we can't find either TracingStarted event, then we'll fallback to the first navStart that
    // looks like it was loading the main frame with a real URL. Because the schema for this event
    // has changed across Chrome versions, we'll be extra defensive about finding this case.
    const navStartEvt = events.find(e => Boolean(e.name === 'navigationStart' && e.args &&
      e.args.data && e.args.data.isLoadingMainFrame && e.args.data.documentLoaderURL));
    // Find the first resource that was requested and make sure it agrees on the id.
    const firstResourceSendEvt = events.find(e => e.name === 'ResourceSendRequest');
    // We know that these properties exist if we found the events, but TSC doesn't.
    if (navStartEvt && navStartEvt.args && navStartEvt.args.data &&
        firstResourceSendEvt &&
        firstResourceSendEvt.pid === navStartEvt.pid &&
        firstResourceSendEvt.tid === navStartEvt.tid) {
      const frameId = navStartEvt.args.frame;
      if (frameId) {
        return {
          pid: navStartEvt.pid,
          tid: navStartEvt.tid,
          frameId,
        };
      }
    }

    throw this.createNoTracingStartedError();
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
   * Finds key trace events, identifies main process/thread, and returns timings of trace events
   * in milliseconds since navigation start in addition to the standard microsecond monotonic timestamps.
   * @param {LH.Trace} trace
   * @return {TraceOfTabWithoutFCP}
  */
  static computeTraceOfTab(trace) {
    // Parse the trace for our key events and sort them by timestamp. Note: sort
    // *must* be stable to keep events correctly nested.
    const keyEvents = this.filteredTraceSort(trace.traceEvents, e => {
      return e.cat.includes('blink.user_timing') ||
          e.cat.includes('loading') ||
          e.cat.includes('devtools.timeline') ||
          e.cat === '__metadata';
    });

    // Find the inspected frame
    const mainFrameIds = this.findMainFrameIds(keyEvents);

    // Filter to just events matching the frame ID for sanity
    const frameEvents = keyEvents.filter(e => e.args.frame === mainFrameIds.frameId);

    // Our navStart will be the last frame navigation in the trace
    const navigationStart = frameEvents.filter(this._isNavigationStartOfInterest).pop();
    if (!navigationStart) throw this.createNoNavstartError();

    // Find our first paint of this frame
    const firstPaint = frameEvents.find(e => e.name === 'firstPaint' && e.ts > navigationStart.ts);

    // FCP will follow at/after the FP. Used in so many places we require it.
    const firstContentfulPaint = frameEvents.find(
      e => e.name === 'firstContentfulPaint' && e.ts > navigationStart.ts
    );

    // fMP will follow at/after the FP
    let firstMeaningfulPaint = frameEvents.find(
      e => e.name === 'firstMeaningfulPaint' && e.ts > navigationStart.ts
    );
    let fmpFellBack = false;

    // If there was no firstMeaningfulPaint event found in the trace, the network idle detection
    // may have not been triggered before Lighthouse finished tracing.
    // In this case, we'll use the last firstMeaningfulPaintCandidate we can find.
    // However, if no candidates were found (a bogus trace, likely), we fail.
    if (!firstMeaningfulPaint) {
      const fmpCand = 'firstMeaningfulPaintCandidate';
      fmpFellBack = true;
      log.verbose('trace-of-tab', `No firstMeaningfulPaint found, falling back to last ${fmpCand}`);
      const lastCandidate = frameEvents.filter(e => e.name === fmpCand).pop();
      if (!lastCandidate) {
        log.verbose('trace-of-tab', 'No `firstMeaningfulPaintCandidate` events found in trace');
      }
      firstMeaningfulPaint = lastCandidate;
    }

    // LCP's trace event was first introduced in m78. We can't surface an LCP for older Chrome versions
    // LCP comes from the latest `largestContentfulPaint::Candidate`, but it can be invalidated
    // by a `largestContentfulPaint::Invalidate` event. In the case that the last candidate is
    // invalidated, the value will be undefined.
    let largestContentfulPaint;
    let lcpInvalidated = false;
    // Iterate the events backwards.
    for (let i = frameEvents.length - 1; i >= 0; i--) {
      const e = frameEvents[i];
      // If the event's timestamp is before the navigation start, stop.
      if (e.ts <= navigationStart.ts) break;
      // If the last lcp event in the trace is 'Invalidate', there is inconclusive data to determine LCP.
      if (e.name === 'largestContentfulPaint::Invalidate') {
        lcpInvalidated = true;
        break;
      }
      // If not an lcp 'Candidate', keep iterating.
      if (e.name !== 'largestContentfulPaint::Candidate') continue;
      // Found the last LCP candidate in the trace, let's use it.
      largestContentfulPaint = e;
      break;
    }

    const load = frameEvents.find(e => e.name === 'loadEventEnd' && e.ts > navigationStart.ts);
    const domContentLoaded = frameEvents.find(
      e => e.name === 'domContentLoadedEventEnd' && e.ts > navigationStart.ts
    );

    // subset all trace events to just our tab's process (incl threads other than main)
    // stable-sort events to keep them correctly nested.
    const processEvents = TraceProcessor
      .filteredTraceSort(trace.traceEvents, e => e.pid === mainFrameIds.pid);

    const mainThreadEvents = processEvents
      .filter(e => e.tid === mainFrameIds.tid);

    // traceEnd must exist since at least navigationStart event was verified as existing.
    const traceEnd = trace.traceEvents.reduce((max, evt) => {
      return max.ts > evt.ts ? max : evt;
    });
    const fakeEndOfTraceEvt = {ts: traceEnd.ts + (traceEnd.dur || 0)};

    /** @param {{ts: number}=} event */
    const getTimestamp = (event) => event && event.ts;
    /** @type {TraceTimesWithoutFCP} */
    const timestamps = {
      navigationStart: navigationStart.ts,
      firstPaint: getTimestamp(firstPaint),
      firstContentfulPaint: getTimestamp(firstContentfulPaint),
      firstMeaningfulPaint: getTimestamp(firstMeaningfulPaint),
      largestContentfulPaint: getTimestamp(largestContentfulPaint),
      traceEnd: fakeEndOfTraceEvt.ts,
      load: getTimestamp(load),
      domContentLoaded: getTimestamp(domContentLoaded),
    };

    /** @param {number} ts */
    const getTiming = (ts) => (ts - navigationStart.ts) / 1000;
    /** @param {number=} ts */
    const maybeGetTiming = (ts) => ts === undefined ? undefined : getTiming(ts);
    /** @type {TraceTimesWithoutFCP} */
    const timings = {
      navigationStart: 0,
      firstPaint: maybeGetTiming(timestamps.firstPaint),
      firstContentfulPaint: maybeGetTiming(timestamps.firstContentfulPaint),
      firstMeaningfulPaint: maybeGetTiming(timestamps.firstMeaningfulPaint),
      largestContentfulPaint: maybeGetTiming(timestamps.largestContentfulPaint),
      traceEnd: getTiming(timestamps.traceEnd),
      load: maybeGetTiming(timestamps.load),
      domContentLoaded: maybeGetTiming(timestamps.domContentLoaded),
    };

    const frames = keyEvents
      .filter(evt => evt.name === 'FrameCommittedInBrowser')
      .map(evt => evt.args.data)
      .filter(/** @return {data is {frame: string, url: string}} */ data => {
        return Boolean(data && data.frame && data.url);
      });

    return {
      timings,
      timestamps,
      processEvents,
      mainThreadEvents,
      mainFrameIds,
      frames,
      navigationStartEvt: navigationStart,
      firstPaintEvt: firstPaint,
      firstContentfulPaintEvt: firstContentfulPaint,
      firstMeaningfulPaintEvt: firstMeaningfulPaint,
      largestContentfulPaintEvt: largestContentfulPaint,
      loadEvt: load,
      domContentLoadedEvt: domContentLoaded,
      fmpFellBack,
      lcpInvalidated,
    };
  }
}

module.exports = TraceProcessor;


/**
 * @typedef ToplevelEvent
 * @prop {number} start
 * @prop {number} end
 * @prop {number} duration
 */
