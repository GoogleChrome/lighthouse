/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ProcessedNavigation} from '../../computed/processed-navigation.js';
import {ProcessedTrace} from '../../computed/processed-trace.js';
import {TraceProcessor} from '../../lib/tracehouse/trace-processor.js';
import {createTestTrace} from '../create-test-trace.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const noFCPtrace = readJson('../fixtures/traces/airhorner_no_fcp.json', import.meta);
const noNavStartTrace = readJson('../fixtures/traces/no_navstart_event.json', import.meta);

describe('ProcessedTrace', () => {
  it('throws NO_SOFT_NAVIGATION when a soft navigation was expected but not found', async () => {
    const trace = createTestTrace({topLevelTasks: [{ts: 1200, duration: 10}]});
    const {pid, tid} = trace.traceEvents[0];
    // The document loaded before tracing started, so none of its load events are in the trace.
    const loadEventNames = ['navigationStart', 'domContentLoadedEventEnd', 'firstContentfulPaint'];
    trace.traceEvents = trace.traceEvents.filter(event => !loadEventNames.includes(event.name));
    trace.traceEvents.push({
      name: 'clock_sync',
      cat: 'loading',
      ph: 'I',
      pid,
      tid,
      ts: 500_000,
      dur: 0,
      args: {sync_id: TraceProcessor.SOFT_NAVIGATION_MARKER_ID},
    });

    const context = {computedCache: new Map()};
    await expect(ProcessedNavigation.request(trace, context))
      .rejects.toMatchObject({code: 'NO_SOFT_NAVIGATION'});
  });

  it('computes the artifact', async () => {
    const context = {computedCache: new Map()};
    const processedNavigation = await ProcessedNavigation.request(pwaTrace, context);

    expect(processedNavigation).toEqual({
      domContentLoadedEvt: {
        args: {
          frame: '0x25a638821e30',
        },
        cat: 'blink.user_timing,rail',
        name: 'domContentLoadedEventEnd',
        ph: 'R',
        pid: 44277,
        tid: 775,
        ts: 225414732309,
        tts: 924831,
      },
      firstContentfulPaintEvt: {
        args: {
          frame: '0x25a638821e30',
        },
        cat: 'loading,rail,devtools.timeline',
        name: 'firstContentfulPaint',
        ph: 'I',
        pid: 44277,
        s: 'p',
        tid: 775,
        ts: 225414670885,
        tts: 866570,
      },
      firstContentfulPaintAllFramesEvt: {
        args: {
          frame: '0x25a638821e30',
        },
        cat: 'loading,rail,devtools.timeline',
        name: 'firstContentfulPaint',
        ph: 'I',
        pid: 44277,
        s: 'p',
        tid: 775,
        ts: 225414670885,
        tts: 866570,
      },
      firstPaintEvt: {
        args: {
          frame: '0x25a638821e30',
        },
        cat: 'loading,rail,devtools.timeline',
        name: 'firstPaint',
        ph: 'I',
        pid: 44277,
        s: 'p',
        tid: 775,
        ts: 225414670868,
        tts: 866553,
      },
      lcpInvalidated: false,
      loadEvt: {
        args: {
          frame: '0x25a638821e30',
        },
        cat: 'blink.user_timing',
        name: 'loadEventEnd',
        ph: 'R',
        pid: 44277,
        tid: 775,
        ts: 225416370913,
        tts: 2369379,
      },
      timestamps: {
        domContentLoaded: 225414732309,
        firstContentfulPaint: 225414670885,
        firstContentfulPaintAllFrames: 225414670885,
        firstPaint: 225414670868,
        load: 225416370913,
        timeOrigin: 225414172015,
        traceEnd: 225426711887,
      },
      timings: {
        domContentLoaded: 560.294,
        firstContentfulPaint: 498.87,
        firstContentfulPaintAllFrames: 498.87,
        firstPaint: 498.853,
        load: 2198.898,
        timeOrigin: 0,
        traceEnd: 12539.872,
      },
    });
  });

  it('accepts a processed trace as input', async () => {
    const context = {computedCache: new Map()};
    const processedTrace = await ProcessedTrace.request(pwaTrace, context);
    const processedNavigation = await ProcessedNavigation.request(processedTrace, context);

    expect(processedNavigation.timings).toEqual({
      domContentLoaded: 560.294,
      firstContentfulPaint: 498.87,
      firstContentfulPaintAllFrames: 498.87,
      firstPaint: 498.853,
      load: 2198.898,
      timeOrigin: 0,
      traceEnd: 12539.872,
    });
  });

  it('fails with NO_NAVSTART', async () => {
    const context = {computedCache: new Map()};
    const compute = async () => {
      await ProcessedNavigation.request(noNavStartTrace, context);
    };
    await expect(compute()).rejects.toMatchObject({code: 'NO_NAVSTART'});
  });

  it('fails with NO_FCP', async () => {
    const context = {computedCache: new Map()};

    const compute = async () => {
      await ProcessedNavigation.request(noFCPtrace, context);
    };

    await expect(compute()).rejects.toMatchObject({code: 'NO_FCP'});
  });
});
