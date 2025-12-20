/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LongTasks = require('../../audits/long-tasks.js');
const createTestTrace = require('../create-test-trace.js');
const devtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

const TASK_URL = 'https://pwa.rocks/';

/* eslint-env jest */

/**
 * @param {Number} count
 * @param {Number} duration
 * @param {Boolean} withChildTasks
 */
function generateTraceWithLongTasks({count, duration = 200, withChildTasks = false}) {
  const baseTs = 1000;
  const traceTasks = [];
  for (let i = 1; i <= count; i++) {
    /* Generates a top-level task w/ the following breakdown:
    task -> {
      ts,
      duration,
      children -> [{ts, duration, url}, ...],
    }
    Child tasks should start after the parent task and end before it.
    Top-level tasks will take on the attributable URL from it's children.
    */
    const ts = baseTs * i;
    const task = {ts, duration};
    task.children = [];
    if (withChildTasks) {
      task.children.push({
        ts: ts + duration / 10,
        duration: duration / 3,
        url: TASK_URL,
      });
      task.children.push({
        ts: ts + duration / 2,
        duration: duration / 3,
        url: TASK_URL,
      });
    }
    traceTasks.push(task);
  }
  return createTestTrace({
    topLevelTasks: traceTasks,
  });
}

describe('Long tasks audit', () => {
  it('should pass and be non-applicable if there are no long tasks', async () => {
    const artifacts = {
      traces: {defaultPass: generateTraceWithLongTasks({count: 0})},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };
    const result = await LongTasks.audit(artifacts, {computedCache: new Map()});
    expect(result.score).toBe(1);
    expect(result.details.items).toHaveLength(0);
    expect(result.displayValue).toBeUndefined();
    expect(result.notApplicable).toBeTruthy();
  });

  it('should return a list of long tasks with duration >= 50 ms', async () => {
    const artifacts = {
      traces: {defaultPass: generateTraceWithLongTasks({count: 4})},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };
    const result = await LongTasks.audit(artifacts, {computedCache: new Map()});
    expect(result.score).toBe(0);
    expect(result.details.items).toHaveLength(4);
    expect(result.displayValue).toBeDisplayString('4 long tasks found');
    expect(result.notApplicable).toBeFalsy();

    for (const item of result.details.items) {
      expect(Number.isFinite(item.duration)).toBeTruthy();
      expect(item.duration).toEqual(200);
      expect(item.url).toEqual('Unattributable');
    }
  });

  it('should filter out tasks with duration less than 50 ms', async () => {
    const trace = createTestTrace({
      topLevelTasks: [
        {ts: 1000, duration: 30},
        {ts: 2000, duration: 100},
        {ts: 3000, duration: 25},
        {ts: 4000, duration: 50},
      ],
    });
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };
    const result = await LongTasks.audit(artifacts, {computedCache: new Map()});
    expect(result.score).toBe(0);
    expect(result.details.items).toHaveLength(2);
    expect(result.displayValue).toBeDisplayString('2 long tasks found');

    for (const item of result.details.items) {
      expect(Number.isFinite(item.duration)).toBeTruthy();
      expect(item.duration).toBeGreaterThanOrEqual(50);
      expect(item.url).toEqual('Unattributable');
    }
  });

  it('should not filter out tasks with duration >= 50 ms only after throttling', async () => {
    const artifacts = {
      traces: {defaultPass: generateTraceWithLongTasks({count: 4, duration: 45})},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };
    const context = {
      computedCache: new Map(),
      settings: {
        throttlingMethod: 'simulate',
        throttling: {
          cpuSlowdownMultiplier: 2,
        },
      },
    };
    const result = await LongTasks.audit(artifacts, context);
    expect(result.score).toBe(0);
    expect(result.details.items).toHaveLength(4);
    expect(result.displayValue).toBeDisplayString('4 long tasks found');

    for (const item of result.details.items) {
      expect(Number.isFinite(item.duration)).toBeTruthy();
      expect(item.duration).toEqual(90);
      expect(item.url).toEqual('Unattributable');
    }
  });

  it('should populate url when tasks have an attributable url', async () => {
    const trace = generateTraceWithLongTasks({count: 1, duration: 300, withChildTasks: true});
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };
    const result = await LongTasks.audit(artifacts, {computedCache: new Map()});
    expect(result.score).toBe(0);
    expect(result.details.items).toHaveLength(1);
    expect(result.displayValue).toBeDisplayString('1 long task found');

    for (const item of result.details.items) {
      expect(Number.isFinite(item.duration)).toBeTruthy();
      expect(item.duration).toBeGreaterThanOrEqual(50);
      expect(item.url).toEqual(TASK_URL);
    }
  });
});
