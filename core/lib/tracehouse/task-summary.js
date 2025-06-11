/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Utility functions for grouping and summarizing tasks.
 */

import {NetworkRequest} from '../network-request.js';

// These trace events, when not triggered by a script inside a particular task, are just general Chrome overhead.
const BROWSER_TASK_NAMES_SET = new Set([
  'CpuProfiler::StartProfiling',
]);

// These trace events, when not triggered by a script inside a particular task, are GC Chrome overhead.
const BROWSER_GC_TASK_NAMES_SET = new Set([
  'V8.GCCompactor',
  'MajorGC',
  'MinorGC',
]);

/**
 * @param {LH.Artifacts.NetworkRequest[]} records
 */
function getJavaScriptURLs(records) {
  /** @type {Set<string>} */
  const urls = new Set();
  for (const record of records) {
    if (record.resourceType === NetworkRequest.TYPES.Script) {
      urls.add(record.url);
    }
  }

  return urls;
}

/**
 * @param {LH.Artifacts.TaskNode} task
 * @param {Set<string>} jsURLs
 * @return {string}
 */
function getAttributableURLForTask(task, jsURLs) {
  const jsURL = task.attributableURLs.find(url => jsURLs.has(url));
  const fallbackURL = task.attributableURLs[0];
  let attributableURL = jsURL || fallbackURL;
  // If we can't find what URL was responsible for this execution, attribute it to the root page
  // or Chrome depending on the type of work.
  if (!attributableURL || attributableURL === 'about:blank') {
    if (BROWSER_TASK_NAMES_SET.has(task.event.name)) attributableURL = 'Browser';
    else if (BROWSER_GC_TASK_NAMES_SET.has(task.event.name)) attributableURL = 'Browser GC';
    else attributableURL = 'Unattributable';
  }

  return attributableURL;
}

/**
 * @param {LH.Artifacts.TaskNode[]} tasks
 * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
 * @return {Map<string, Record<string, number>>}
 */
function getExecutionTimingsByURL(tasks, networkRecords) {
  const jsURLs = getJavaScriptURLs(networkRecords);

  /** @type {Map<string, Record<string, number>>} */
  const result = new Map();

  for (const task of tasks) {
    const attributableURL = getAttributableURLForTask(task, jsURLs);
    const timingByGroupId = result.get(attributableURL) || {};
    const originalTime = timingByGroupId[task.group.id] || 0;
    timingByGroupId[task.group.id] = originalTime + task.selfTime;
    result.set(attributableURL, timingByGroupId);
  }

  return result;
}

export {
  getJavaScriptURLs,
  getAttributableURLForTask,
  getExecutionTimingsByURL,
};
