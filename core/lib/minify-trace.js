/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Minifies a trace by removing events that are not needed for
 * Lantern metric calculations and by throttling screenshot events.
 */

import {TraceProcessor} from './tracehouse/trace-processor.js';

const topLevelTaskNames = new Set([
  'RunTask', // m71+
  'ThreadControllerImpl::RunTask', // m69-70
  'ThreadControllerImpl::DoWork', // m66-68
  'TaskQueueManager::ProcessTaskFromWorkQueue', // m65 and below
]);

const traceCategoriesToAlwaysKeep = new Set([
  // Labels the threads correctly in DevTools Performance panel.
  '__metadata',
]);

const traceCategoriesToDrop = new Set([
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-v8.cpu_profiler',
  'disabled-by-default-v8.cpu_profiler.hires',
  'latencyInfo',
]);

const traceEventsToAlwaysKeep = new Set([
  'Screenshot',
  'TracingStartedInBrowser',
  'TracingStartedInPage',
  'navigationStart',
  'ParseAuthorStyleSheet',
  'ParseHTML',
  'PlatformResourceSendRequest',
  'ResourceSendRequest',
  'ResourceReceiveResponse',
  'ResourceFinish',
  'ResourceReceivedData',
  'EventDispatch',
  'LayoutShift',
  'FrameCommittedInBrowser',
  // Not currently used by Lighthouse but might be used in the future for cross-frame LCP.
  'NavStartToLargestContentfulPaint::Invalidate::AllFrames::UKM',
  'NavStartToLargestContentfulPaint::Candidate::AllFrames::UKM',
]);

const traceEventsToKeepInTopLevelTask = new Set([
  // Needed for CPU node timing simulations.
  'Layout',
  'RunMicrotasks',
  // All of these are needed to create graph relationships.
  'TimerInstall',
  'TimerFire',
  'InvalidateLayout',
  'ScheduleStyleRecalculation',
  'EvaluateScript',
  'XHRReadyStateChange',
  'FunctionCall',
  'v8.compile',
  'ParseAuthorStyleSheet',
  'ResourceSendRequest',
]);

const traceEventsToKeepInProcess = new Set([
  ...topLevelTaskNames,
  ...traceEventsToKeepInTopLevelTask,

  // See the DevTools marker events.
  // https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/timeline/TimelineUIUtils.ts
  'firstPaint',
  'firstContentfulPaint',
  'firstMeaningfulPaint',
  'firstMeaningfulPaintCandidate',
  'loadEventEnd',
  'MarkLoad',
  'domContentLoadedEventEnd',
  'MarkDOMContent',
  'largestContentfulPaint::Invalidate',
  'largestContentfulPaint::Candidate',
  'Animation',
]);

/**
 * @param {LH.TraceEvent} event
 * @return {boolean}
 */
function hasDroppedCategory(event) {
  const categories = event.cat?.split(',') || [];
  return categories.some(category => traceCategoriesToDrop.has(category));
}

/**
 * @param {LH.TraceEvent[]} events
 * @return {LH.TraceEvent[]}
 */
function filterOutUnnecessaryTasksByNameAndDuration(events) {
  const {startingPid} = TraceProcessor.findMainFrameIds(events);

  return events.filter(event => {
    if (hasDroppedCategory(event)) return false;
    if (topLevelTaskNames.has(event.name) && event.dur && event.dur < 1000) return false;
    if (event.pid === startingPid && traceEventsToKeepInProcess.has(event.name)) return true;
    if (event.cat && traceCategoriesToAlwaysKeep.has(event.cat)) return true;
    return traceEventsToAlwaysKeep.has(event.name);
  });
}

/**
 * Filters out tasks that are not within a top-level task.
 * @param {LH.TraceEvent[]} events
 * @return {LH.TraceEvent[]}
 */
function filterOutOrphanedTasks(events) {
  const topLevelRanges = events
    .filter(event => topLevelTaskNames.has(event.name) && event.dur)
    .map(event => [event.ts, event.ts + event.dur]);

  /** @param {LH.TraceEvent} event */
  const isInTopLevelTask =
    event => topLevelRanges.some(([start, end]) => event.ts >= start && event.ts <= end);

  return events.filter((event, index) => {
    if (!traceEventsToKeepInTopLevelTask.has(event.name)) return true;
    if (!isInTopLevelTask(event)) return false;

    if (event.ph === 'B') {
      const endEvent = events.slice(index).find(e => e.name === event.name && e.ph === 'E');
      return endEvent && isInTopLevelTask(endEvent);
    }

    return true;
  });
}

/**
 * Throttles screenshot events in the trace to 2fps.
 * @param {LH.TraceEvent[]} events
 * @return {LH.TraceEvent[]}
 */
function filterOutExcessiveScreenshots(events) {
  const screenshotTimestamps = events.filter(event => event.name === 'Screenshot')
    .map(event => event.ts);

  let lastScreenshotTs = -Infinity;
  return events.filter(event => {
    if (event.name !== 'Screenshot') return true;
    const timeSinceLastScreenshot = event.ts - lastScreenshotTs;
    const nextScreenshotTs = screenshotTimestamps.find(ts => ts > event.ts);
    const timeUntilNextScreenshot = nextScreenshotTs ? nextScreenshotTs - event.ts : Infinity;
    const threshold = 500 * 1000; // Throttle to ~2fps.
    const shouldKeep = timeUntilNextScreenshot > threshold || timeSinceLastScreenshot > threshold;
    if (shouldKeep) lastScreenshotTs = event.ts;
    return shouldKeep;
  });
}

/**
 * @param {LH.TraceEvent[]} events
 * @return {LH.TraceEvent[]}
 */
function filterTraceEvents(events) {
  let filtered = filterOutUnnecessaryTasksByNameAndDuration(events);
  filtered = filterOutOrphanedTasks(filtered);
  return filterOutExcessiveScreenshots(filtered);
}

/**
 * @param {LH.Trace} inputTrace
 * @return {LH.Trace}
 */
function minifyTrace(inputTrace) {
  return {
    ...inputTrace,
    traceEvents: filterTraceEvents(inputTrace.traceEvents),
  };
}

export {minifyTrace};
