/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {MainThreadTasks} from '../../computed/main-thread-tasks.js';
import {createTestTrace} from '../create-test-trace.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);

describe('MainThreadTasksComputed', () => {
  it('computes the artifact', async () => {
    const context = {computedCache: new Map()};
    const tasks = await MainThreadTasks.request(pwaTrace, context);
    expect(tasks.length).toEqual(4779);
  });

  it('excludes completed pre-navigation task trees from execution time', async () => {
    const trace = createTestTrace({
      timeOrigin: 100,
      topLevelTasks: [
        {ts: 10, duration: 90, children: [{ts: 20, duration: 30, url: 'before.js'}]},
        {ts: 110, duration: 20, children: [{ts: 115, duration: 5, url: 'after.js'}]},
      ],
    });
    const context = {computedCache: new Map()};
    const tasks = await MainThreadTasks.request(trace, context);

    expect(tasks).toHaveLength(2);
    expect(tasks.map(task => task.attributableURLs)).toEqual([['after.js'], ['after.js']]);
    expect(tasks.reduce((total, task) => total + task.selfTime, 0)).toBe(20);
    expect(tasks[0].children).toEqual([tasks[1]]);
    expect(tasks[1].parent).toBe(tasks[0]);
  });

  it('preserves task trees that overlap the navigation time origin', async () => {
    const trace = createTestTrace({
      timeOrigin: 100,
      topLevelTasks: [{
        ts: 90,
        duration: 30,
        children: [
          {ts: 91, duration: 3, url: 'before.js'},
          {ts: 105, duration: 5, url: 'after.js'},
        ],
      }],
    });
    const tasks = await MainThreadTasks.request(trace, {computedCache: new Map()});

    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({startTime: -10, endTime: 20, duration: 30, selfTime: 22});
    expect(tasks[0].children).toEqual([tasks[1], tasks[2]]);
    expect(tasks[1]).toMatchObject({startTime: -9, endTime: -6, duration: 3, selfTime: 3});
    expect(tasks[2]).toMatchObject({startTime: 5, endTime: 10, duration: 5, selfTime: 5});
  });

  it('returns no tasks when all task trees completed before navigation', async () => {
    const trace = createTestTrace({
      timeOrigin: 100,
      topLevelTasks: [{ts: 10, duration: 20}],
    });
    const tasks = await MainThreadTasks.request(trace, {computedCache: new Map()});
    expect(tasks).toEqual([]);
  });
});
