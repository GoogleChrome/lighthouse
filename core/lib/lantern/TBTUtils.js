/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const BLOCKING_TIME_THRESHOLD = 50;

/**
 * For TBT, We only want to consider tasks that fall in our time range
 * - FCP and TTI for navigation mode
 * - Trace start and trace end for timespan mode
 *
 * FCP is picked as `startTimeMs` because there is little risk of user input happening
 * before FCP so Long Queuing Qelay regions do not harm user experience. Developers should be
 * optimizing to reach FCP as fast as possible without having to worry about task lengths.
 *
 * TTI is picked as `endTimeMs` because we want a well defined end point for page load.
 *
 * @param {{start: number, end: number, duration: number}} event
 * @param {number} startTimeMs Should be FCP in navigation mode and the trace start time in timespan mode
 * @param {number} endTimeMs Should be TTI in navigation mode and the trace end time in timespan mode
 * @param {{start: number, end: number, duration: number}} [topLevelEvent] Leave unset if `event` is top level. Has no effect if `event` has the same duration as `topLevelEvent`.
 * @return {number}
 */
function calculateTbtImpactForEvent(event, startTimeMs, endTimeMs, topLevelEvent) {
  let threshold = BLOCKING_TIME_THRESHOLD;

  // If a task is not top level, it doesn't make sense to subtract the entire 50ms
  // blocking threshold from the event.
  //
  // e.g. A 80ms top level task with two 40ms children should attribute some blocking
  // time to the 40ms tasks even though they do not meet the 50ms threshold.
  //
  // The solution is to scale the threshold for child events to be considered blocking.
  if (topLevelEvent) threshold *= (event.duration / topLevelEvent.duration);

  if (event.duration < threshold) return 0;
  if (event.end < startTimeMs) return 0;
  if (event.start > endTimeMs) return 0;

  // Perform the clipping and then calculate Blocking Region. So if we have a 150ms task
  // [0, 150] and `startTimeMs` is at 50ms, we first clip the task to [50, 150], and then
  // calculate the Blocking Region to be [100, 150]. The rational here is that tasks before
  // the start time are unimportant, so we care whether the main thread is busy more than
  // 50ms at a time only after the start time.
  const clippedStart = Math.max(event.start, startTimeMs);
  const clippedEnd = Math.min(event.end, endTimeMs);
  const clippedDuration = clippedEnd - clippedStart;
  if (clippedDuration < threshold) return 0;

  return clippedDuration - threshold;
}

/**
 * @param {Array<{start: number, end: number, duration: number}>} topLevelEvents
 * @param {number} startTimeMs
 * @param {number} endTimeMs
 * @return {number}
 */
function calculateSumOfBlockingTime(topLevelEvents, startTimeMs, endTimeMs) {
  if (endTimeMs <= startTimeMs) return 0;

  let sumBlockingTime = 0;
  for (const event of topLevelEvents) {
    sumBlockingTime += calculateTbtImpactForEvent(event, startTimeMs, endTimeMs);
  }

  return sumBlockingTime;
}

export {
  BLOCKING_TIME_THRESHOLD,
  calculateSumOfBlockingTime,
  calculateTbtImpactForEvent,
};
