/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ProcessedSoftNavigations} from '../../computed/processed-soft-navigations.js';
import {TraceProcessor} from '../../lib/tracehouse/trace-processor.js';
import {createTestTrace, rootFrame} from '../create-test-trace.js';

/**
 * @param {Partial<LH.TraceEvent> & Pick<LH.TraceEvent, 'name'|'ts'>} event
 * @return {LH.TraceEvent}
 */
function traceEvent(event) {
  return {
    args: {},
    cat: 'loading',
    ph: 'I',
    pid: 1,
    tid: 1,
    ...event,
  };
}

/**
 * @param {LH.TraceEvent[]} traceEvents
 * @return {LH.Trace}
 */
function trace(traceEvents) {
  const baseTrace = createTestTrace({});
  baseTrace.traceEvents.push(...traceEvents);
  return baseTrace;
}

/**
 * @param {{
 *   navigationId: number,
 *   startTs: number,
 *   fcpTs?: number,
 *   softNavigationContextId?: number,
 *   url?: string,
 * }} options
 * @return {LH.TraceEvent}
 */
function softNavigationStart(options) {
  return traceEvent({
    name: 'SoftNavigationStart',
    ts: options.startTs,
    args: /** @type {LH.TraceEvent['args']} */ ({
      context: {
        URL: options.url,
        firstContentfulPaint: options.fcpTs,
        performanceTimelineNavigationId: options.navigationId,
        softNavContextId: options.softNavigationContextId,
        timeOrigin: options.startTs,
      },
      frame: rootFrame,
    }),
  });
}

/**
 * @param {{navigationId: number, ts: number}} options
 * @return {LH.TraceEvent}
 */
function softNavigationLcp(options) {
  return traceEvent({
    name: 'largestContentfulPaint::CandidateForSoftNavigation',
    ts: options.ts,
    args: /** @type {LH.TraceEvent['args']} */ ({
      data: {performanceTimelineNavigationId: options.navigationId},
      frame: rootFrame,
    }),
  });
}

/** @return {LH.TraceEvent} */
function timespanMarker() {
  return traceEvent({
    name: 'clock_sync',
    ts: 500_000,
    args: {sync_id: TraceProcessor.TIMESPAN_MARKER_ID},
  });
}

describe('ProcessedSoftNavigations', () => {
  it('returns an empty array when no soft navigation was detected', async () => {
    const inputTrace = trace([
      timespanMarker(),
      traceEvent({name: 'RunTask', ts: 1_000_000, dur: 50_000}),
    ]);

    const result = await ProcessedSoftNavigations.request(
      inputTrace, {computedCache: new Map()});

    expect(result).toEqual([]);
  });

  it('normalizes one soft navigation and its paint timings', async () => {
    const firstLcp = softNavigationLcp({navigationId: 7, ts: 1_090_000});
    const lastLcp = softNavigationLcp({navigationId: 7, ts: 1_100_000});
    const inputTrace = trace([
      timespanMarker(),
      softNavigationStart({
        navigationId: 7,
        softNavigationContextId: 42,
        startTs: 1_000_000,
        fcpTs: 1_080_000,
        url: 'https://example.com/cart',
      }),
      firstLcp,
      lastLcp,
      traceEvent({name: 'RunTask', ts: 1_200_000, dur: 50_000}),
    ]);

    const result = await ProcessedSoftNavigations.request(
      inputTrace, {computedCache: new Map()});

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      navigationId: '7',
      softNavigationContextId: 42,
      url: 'https://example.com/cart',
      softNavigationStartEvt: inputTrace.traceEvents[7],
      largestContentfulPaintEvt: lastLcp,
      timestamps: {
        timeOrigin: 1_000_000,
        firstContentfulPaint: 1_080_000,
        largestContentfulPaint: 1_100_000,
        windowEnd: 1_250_000,
      },
      timings: {
        timeOrigin: 0,
        firstContentfulPaint: 80,
        largestContentfulPaint: 100,
        windowEnd: 250,
      },
    });
  });

  it('correlates paints by navigation id and bounds each navigation', async () => {
    const firstLcp = softNavigationLcp({navigationId: 1, ts: 1_090_000});
    const lateFirstLcp = softNavigationLcp({navigationId: 1, ts: 2_010_000});
    const secondLcp = softNavigationLcp({navigationId: 2, ts: 2_090_000});
    const inputTrace = trace([
      timespanMarker(),
      softNavigationStart({navigationId: 1, startTs: 1_000_000}),
      firstLcp,
      softNavigationStart({navigationId: 2, startTs: 2_000_000}),
      lateFirstLcp,
      secondLcp,
    ]);

    const result = await ProcessedSoftNavigations.request(
      inputTrace, {computedCache: new Map()});

    expect(result).toHaveLength(2);
    expect(result[0].timestamps.windowEnd).toBe(2_000_000);
    expect(result[0].largestContentfulPaintEvt).toBe(firstLcp);
    expect(result[1].largestContentfulPaintEvt).toBe(secondLcp);
  });

  it('uses half-open windows except at the end of the trace', async () => {
    const boundaryLcp = softNavigationLcp({navigationId: 1, ts: 2_000_000});
    const finalLcp = softNavigationLcp({navigationId: 2, ts: 3_000_000});
    const inputTrace = trace([
      timespanMarker(),
      softNavigationStart({navigationId: 1, startTs: 1_000_000}),
      softNavigationStart({navigationId: 2, startTs: 2_000_000}),
      boundaryLcp,
      finalLcp,
    ]);

    const result = await ProcessedSoftNavigations.request(
      inputTrace, {computedCache: new Map()});

    expect(result[0].largestContentfulPaintEvt).toBeUndefined();
    expect(result[1].largestContentfulPaintEvt).toBe(finalLcp);
    expect(result[1].timestamps.largestContentfulPaint).toBe(3_000_000);
  });

  it('ignores soft navigations before the timespan marker', async () => {
    const inputTrace = trace([
      softNavigationStart({navigationId: 1, startTs: 100_000}),
      timespanMarker(),
      softNavigationStart({navigationId: 2, startTs: 1_000_000}),
    ]);

    const result = await ProcessedSoftNavigations.request(
      inputTrace, {computedCache: new Map()});

    expect(result).toHaveLength(1);
    expect(result[0].navigationId).toBe('2');
  });

  it('leaves missing paint timings undefined', async () => {
    const inputTrace = trace([
      timespanMarker(),
      softNavigationStart({navigationId: 1, startTs: 1_000_000}),
    ]);

    const result = await ProcessedSoftNavigations.request(
      inputTrace, {computedCache: new Map()});

    expect(result[0].timings.firstContentfulPaint).toBeUndefined();
    expect(result[0].timings.largestContentfulPaint).toBeUndefined();
  });
});
