/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from '../../lib/lighthouse-logger.js';
import {timers} from '../test-env/fake-timers.js';

// Capture the real clock before any test installs fake timers (which also fake `process.hrtime`).
const hrtimeBigint = process.hrtime.bigint;

/**
 * Block for at least `ms` of real time.
 * @param {number} ms
 */
function busyWait(ms) {
  const start = hrtimeBigint();
  while (hrtimeBigint() - start < BigInt(ms * 1e6)) {
    // Busy wait.
  }
}

describe('lighthouse-logger timing', () => {
  beforeEach(() => {
    log.takeTimeEntries();
  });

  afterEach(() => {
    timers.useRealTimers();
    log.takeTimeEntries();
  });

  it('records a measure entry for time/timeEnd', () => {
    log.time({msg: 'Doing thing', id: 'lh:test:thing'});
    busyWait(2);
    log.timeEnd({msg: 'Did thing', id: 'lh:test:thing'});

    const entries = log.getTimeEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      name: 'lh:test:thing',
      entryType: 'measure',
      startTime: expect.any(Number),
      duration: expect.any(Number),
    });
    expect(entries[0].startTime).toBeGreaterThan(0);
    expect(entries[0].duration).toBeGreaterThanOrEqual(2);
  });

  it('sorts entries by startTime', () => {
    log.time({msg: 'outer', id: 'lh:test:outer'});
    busyWait(1);
    log.time({msg: 'inner', id: 'lh:test:inner'});
    busyWait(1);
    log.timeEnd({msg: 'inner', id: 'lh:test:inner'});
    log.timeEnd({msg: 'outer', id: 'lh:test:outer'});
    log.time({msg: 'after', id: 'lh:test:after'});
    log.timeEnd({msg: 'after', id: 'lh:test:after'});

    const entries = log.getTimeEntries();
    expect(entries.map(e => e.name)).toEqual(['lh:test:outer', 'lh:test:inner', 'lh:test:after']);
    const [outer, inner] = entries;
    expect(outer.startTime).toBeLessThan(inner.startTime);
    expect(outer.duration).toBeGreaterThan(inner.duration);
  });

  it('uses the latest start time for a reused id', () => {
    log.time({msg: 'first', id: 'lh:test:dupe'});
    busyWait(5);
    log.time({msg: 'second', id: 'lh:test:dupe'});
    log.timeEnd({msg: 'end', id: 'lh:test:dupe'});

    const entries = log.getTimeEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].duration).toBeLessThan(5);
  });

  it('throws when ending a timer that was never started', () => {
    expect(() => log.timeEnd({msg: 'end', id: 'lh:test:unknown'}))
      .toThrow('no known mark: lh:test:unknown');
    expect(log.getTimeEntries()).toEqual([]);
  });

  it('getTimeEntries returns a copy without clearing', () => {
    log.time({msg: 'a', id: 'lh:test:a'});
    log.timeEnd({msg: 'a', id: 'lh:test:a'});

    const entries = log.getTimeEntries();
    entries.pop();
    expect(log.getTimeEntries()).toHaveLength(1);
  });

  it('takeTimeEntries returns entries and clears entries and in-progress timers', () => {
    log.time({msg: 'a', id: 'lh:test:a'});
    log.timeEnd({msg: 'a', id: 'lh:test:a'});
    log.time({msg: 'b', id: 'lh:test:b'});

    const taken = log.takeTimeEntries();
    expect(taken.map(e => e.name)).toEqual(['lh:test:a']);
    expect(log.getTimeEntries()).toEqual([]);
    expect(log.takeTimeEntries()).toEqual([]);
    expect(() => log.timeEnd({msg: 'b', id: 'lh:test:b'})).toThrow('no known mark: lh:test:b');

    // Previously taken entries are not affected by new timings.
    log.time({msg: 'c', id: 'lh:test:c'});
    log.timeEnd({msg: 'c', id: 'lh:test:c'});
    expect(taken.map(e => e.name)).toEqual(['lh:test:a']);
  });

  it('is unaffected by fake timers', () => {
    timers.useFakeTimers();

    log.time({msg: 'a', id: 'lh:test:a'});
    busyWait(2);
    log.timeEnd({msg: 'a', id: 'lh:test:a'});
    log.time({msg: 'b', id: 'lh:test:b'});
    timers.advanceTimersByTime(60_000);
    log.timeEnd({msg: 'b', id: 'lh:test:b'});

    const [a, b] = log.getTimeEntries();
    // Real time elapsed even though the fake clock did not advance...
    expect(a.duration).toBeGreaterThanOrEqual(2);
    expect(b.startTime).toBeGreaterThan(a.startTime);
    // ...and advancing the fake clock does not affect measurements.
    expect(b.duration).toBeLessThan(60_000);
  });
});
