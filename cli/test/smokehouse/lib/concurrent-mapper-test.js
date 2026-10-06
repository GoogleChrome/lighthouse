/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ConcurrentMapper} from './concurrent-mapper.js';

/**
 * @param {number} ms
 * @return {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('ConcurrentMapper', () => {
  it('respects concurrency limit and preserves result order in map and pooledMap', async () => {
    const values = [0, 1, 2, 3, 4, 5];
    let activeCount = 0;
    let maxActiveCount = 0;

    const results = await ConcurrentMapper.map(values, async (value) => {
      activeCount++;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      // Vary delays so earlier items can finish after later items within a batch.
      await delay(value % 2 === 0 ? 15 : 5);
      activeCount--;
      return value * 10;
    }, {concurrency: 2});

    expect(maxActiveCount).toBe(2);
    expect(activeCount).toBe(0);
    expect(results).toEqual([0, 10, 20, 30, 40, 50]);
  });

  it('defaults to Infinite concurrency when options or concurrency is omitted', async () => {
    const cm = new ConcurrentMapper();
    const values = [1, 2, 3, 4];
    let activeCount = 0;
    let maxActiveCount = 0;

    const results = await cm.pooledMap(values, async (value) => {
      activeCount++;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      await delay(10);
      activeCount--;
      return value * 2;
    }, {});

    expect(maxActiveCount).toBe(4);
    expect(results).toEqual([2, 4, 6, 8]);
  });

  it('runs concurrency: 1 jobs exclusively without starvation among parallel jobs', async () => {
    const cm = new ConcurrentMapper();
    const jobSpecs = [
      {id: 0, concurrency: 3},
      {id: 1, concurrency: 3},
      {id: 2, concurrency: 3},
      {id: 3, concurrency: 1},
      {id: 4, concurrency: 3},
      {id: 5, concurrency: 3},
      {id: 6, concurrency: 3},
      {id: 7, concurrency: 3},
      {id: 8, concurrency: 1},
      {id: 9, concurrency: 3},
      {id: 10, concurrency: 3},
    ];

    /** @type {Set<number>} */
    const activeJobs = new Set();
    /** @type {Map<number, number>} */
    const maxConcurrentDuringJob = new Map();
    /** @type {number[]} */
    const startOrder = [];

    const promises = jobSpecs.map(spec => {
      return cm.runInPool(async () => {
        startOrder.push(spec.id);
        activeJobs.add(spec.id);
        for (const activeId of activeJobs) {
          const prevMax = maxConcurrentDuringJob.get(activeId) ?? 0;
          maxConcurrentDuringJob.set(activeId, Math.max(prevMax, activeJobs.size));
        }

        await delay(10);

        for (const activeId of activeJobs) {
          const prevMax = maxConcurrentDuringJob.get(activeId) ?? 0;
          maxConcurrentDuringJob.set(activeId, Math.max(prevMax, activeJobs.size));
        }
        activeJobs.delete(spec.id);
        return spec.id;
      }, {concurrency: spec.concurrency});
    });

    const results = await Promise.all(promises);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Jobs must start in FIFO order without concurrency: 3 jobs leapfrogging concurrency: 1 jobs.
    expect(startOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Serial (concurrency: 1) jobs must never run alongside any other job.
    expect(maxConcurrentDuringJob.get(3)).toBe(1);
    expect(maxConcurrentDuringJob.get(8)).toBe(1);

    // Parallel (concurrency: 3) jobs can run up to 3 at a time, but never more than 3.
    expect(maxConcurrentDuringJob.get(0)).toBe(3);
    expect(maxConcurrentDuringJob.get(4)).toBe(3);
    for (const spec of jobSpecs) {
      expect(maxConcurrentDuringJob.get(spec.id)).toBeLessThanOrEqual(spec.concurrency);
    }
  });

  it('cleans up pool state on rejection so subsequent jobs can still run', async () => {
    const cm = new ConcurrentMapper();

    const failingPromise = cm.pooledMap([1, 2, 3], async (value) => {
      await delay(5);
      if (value === 2) {
        throw new Error('boom');
      }
      return value;
    }, {concurrency: 2});

    await expect(failingPromise).rejects.toThrow('boom');

    // Wait for any remaining in-flight job from the failed map to finish.
    await delay(15);

    // Subsequent concurrency: 1 and concurrency: 2 jobs should still run cleanly.
    const singleResult = await cm.runInPool(async () => 'recovered', {concurrency: 1});
    expect(singleResult).toBe('recovered');

    const mappedResult = await cm.pooledMap([10, 20], async x => x + 1, {concurrency: 2});
    expect(mappedResult).toEqual([11, 21]);
  });

  it('throws on invalid concurrency option values', async () => {
    const cm = new ConcurrentMapper();

    for (const invalidConcurrency of [0, -1, NaN]) {
      await expect(
        cm.pooledMap([1], async x => x, {concurrency: invalidConcurrency})
      ).rejects.toThrow(`Invalid concurrency: ${invalidConcurrency}`);

      await expect(
        cm.runInPool(async () => 1, {concurrency: invalidConcurrency})
      ).rejects.toThrow(`Invalid concurrency: ${invalidConcurrency}`);
    }
  });
});
