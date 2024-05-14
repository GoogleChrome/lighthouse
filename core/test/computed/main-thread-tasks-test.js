/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {MainThreadTasks} from '../../computed/main-thread-tasks.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);

describe('MainThreadTasksComputed', () => {
  it('computes the artifact', async () => {
    const context = {computedCache: new Map()};
    const tasks = await MainThreadTasks.request(pwaTrace, context);
    expect(tasks.length).toEqual(4784);
  });

  it('uses negative timestamps for tasks before navStart', async () => {
    const context = {computedCache: new Map()};
    const tasks = await MainThreadTasks.request(pwaTrace, context);
    expect(tasks[0]).toMatchObject({
      startTime: expect.toBeApproximately(-3, 1),
      endTime: expect.toBeApproximately(-3, 1),
    });
    expect(tasks[1]).toMatchObject({
      startTime: expect.toBeApproximately(-3, 1),
      endTime: expect.toBeApproximately(-2.8, 1),
    });
  });
});
