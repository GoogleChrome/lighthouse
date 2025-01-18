/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import MaxPotentialFid from '../../../audits/metrics/max-potential-fid.js';
import {createTestTrace} from '../../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

/**
 * @typedef LoafDef
 * @property {number} ts LoAF trace event timestamp in milliseconds relative to timeOrigin.
 * @property {number} duration Duration of LoAF in milliseconds.
 * @property {number} blockingDuration Blocking duration of LoAF in milliseconds.
 */

/**
 * @param {LH.TraceEvent} navStartEvt
 * @param {LoafDef} loafDef
 */
function createLoafEvents(navStartEvt, {ts, duration, blockingDuration}) {
  const {pid, tid} = navStartEvt;
  ts *= 1000;
  const endTs = ts + duration * 1000;

  return [{
    name: 'LongAnimationFrame',
    ph: 'b',
    cat: 'devtools.timeline',
    pid,
    tid,
    ts,
    args: {
      data: {
        duration,
        blockingDuration,
        numScripts: 1,
        renderDuration: 14,
        styleAndLayoutDuration: 13,
      },
    },
  }, {
    name: 'LongAnimationFrame',
    ph: 'e',
    cat: 'devtools.timeline',
    pid,
    tid,
    ts: endTs,
    args: {},
  }];
}

describe('Max Potential FID', () => {
  it('evaluates MPFID and includes LoAF debug data', async () => {
    const frameUrl = 'https://example.com/';
    const topLevelTasks = [
      {ts: 2000, duration: 2999, blockingDuration: 1500}, // Right up to FCP.
      {ts: 5500, duration: 1000, blockingDuration: 500}, // Longest `blockingDuration` after FCP.
      {ts: 8000, duration: 2000, blockingDuration: 10}, // Longest `duration` after FCP.
    ];
    const trace = createTestTrace({firstContentfulPaint: 5000, frameUrl, topLevelTasks});

    // Add LoAF events (reusing long task timings).
    const navStart = trace.traceEvents.find(evt => evt.name === 'navigationStart');
    for (const task of topLevelTasks) {
      trace.traceEvents.push(...createLoafEvents(navStart, task));
    }

    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog([{url: frameUrl}])},
      GatherContext: {gatherMode: 'navigation'},
    };
    const context = {
      settings: {throttlingMethod: 'devtools'},
      computedCache: new Map(),
      options: MaxPotentialFid.defaultOptions,
    };

    const result = await MaxPotentialFid.audit(artifacts, context);
    expect(result).toMatchObject({
      score: 0,
      numericValue: 2000,
      numericUnit: 'millisecond',
      displayValue: expect.toBeDisplayString('2,000 ms'),
      details: {
        type: 'debugdata',
        observedMaxDurationLoaf: {
          name: 'LongAnimationFrame',
          args: {
            data: {
              duration: 2000,
              blockingDuration: 10,
            },
          },
        },
        observedMaxBlockingLoaf: {
          name: 'LongAnimationFrame',
          args: {
            data: {
              duration: 1000,
              blockingDuration: 500,
            },
          },
        },
        observedLoafs: [
          {startTime: 2000, duration: 2999, blockingDuration: 1500},
          {startTime: 5500, duration: 1000, blockingDuration: 500},
          {startTime: 8000, duration: 2000, blockingDuration: 10},
        ],
      },
    });
  });

  it('includes LoAFs before FCP in observedLoafs', async () => {
    const frameUrl = 'https://example.com/';
    const topLevelTasks = [
      {ts: 1000, duration: 1000, blockingDuration: 1000},
      {ts: 2000, duration: 1000, blockingDuration: 1000},
      {ts: 3000, duration: 1000, blockingDuration: 1000},
    ];
    const trace = createTestTrace({firstContentfulPaint: 5000, frameUrl, topLevelTasks});

    // Add LoAF events (reusing long task timings).
    const navStart = trace.traceEvents.find(evt => evt.name === 'navigationStart');
    for (const task of topLevelTasks) {
      trace.traceEvents.push(...createLoafEvents(navStart, task));
    }

    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog([{url: frameUrl}])},
      GatherContext: {gatherMode: 'navigation'},
    };
    const context = {
      settings: {throttlingMethod: 'devtools'},
      computedCache: new Map(),
      options: MaxPotentialFid.defaultOptions,
    };

    const result = await MaxPotentialFid.audit(artifacts, context);
    expect(result).toMatchObject({
      score: 1,
      numericValue: 16,
      details: {
        type: 'debugdata',
        observedMaxDurationLoaf: undefined,
        observedMaxBlockingLoaf: undefined,
        observedLoafs: [
          {startTime: 1000, duration: 1000, blockingDuration: 1000},
          {startTime: 2000, duration: 1000, blockingDuration: 1000},
          {startTime: 3000, duration: 1000, blockingDuration: 1000},
        ],
      },
    });
  });
});
