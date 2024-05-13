/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {FirstMeaningfulPaint} from '../../../computed/metrics/first-meaningful-paint.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const pwaTrace = readJson('../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const pwaDevtoolsLog = readJson('../../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);
const badNavStartTrace = readJson('../../fixtures/traces/bad-nav-start-ts.json', import.meta);
const lateTracingStartedTrace = readJson('../../fixtures/traces/tracingstarted-after-navstart.json', import.meta);
const preactTrace = readJson('../../fixtures/traces/preactjs.com_ts_of_undefined.json', import.meta);
const noFMPtrace = readJson('../../fixtures/traces/no_fmp_event.json', import.meta);

describe('Metrics: FMP', () => {
  const gatherContext = {gatherMode: 'navigation'};
  let settings;
  let trace;
  let devtoolsLog;

  function addEmptyTask() {
    const mainThreadEvt = trace.traceEvents.find(e => e.name === 'TracingStartedInPage');
    trace.traceEvents.push({
      ...mainThreadEvt,
      cat: 'toplevel',
      name: 'TaskQueueManager::ProcessTaskFromWorkQueue',
    });
  }

  beforeEach(() => {
    settings = {throttlingMethod: 'provided'};
    devtoolsLog = [];
  });

  it('should compute a simulated value', async () => {
    settings = {throttlingMethod: 'simulate'};
    trace = pwaTrace;
    devtoolsLog = pwaDevtoolsLog;
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request(
      {trace, devtoolsLog, gatherContext, settings, URL},
      context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
      optimisticNodeTimings: result.optimisticEstimate.nodeTimings.size,
      pessimisticNodeTimings: result.pessimisticEstimate.nodeTimings.size,
    }).toMatchSnapshot();
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute an observed value (desktop)', async () => {
    settings = {throttlingMethod: 'provided', formFactor: 'desktop'};
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, gatherContext, settings},
      context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 350560359679,
  "timing": 204.151,
}
`);
  });

  it('should compute an observed value (mobile)', async () => {
    settings = {throttlingMethod: 'provided', formFactor: 'mobile'};
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, gatherContext, settings},
      context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 350560359679,
  "timing": 204.151,
}
`);
  });

  it('handles cases when there was a tracingStartedInPage after navStart', async () => {
    trace = lateTracingStartedTrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, gatherContext, settings},
      context);
    assert.equal(Math.round(result.timing), 530);
    assert.equal(result.timestamp, 29344070867);
  });

  it('handles cases when there was a tracingStartedInPage after navStart #2', async () => {
    trace = badNavStartTrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, gatherContext, settings},
      context);
    assert.equal(Math.round(result.timing), 632);
    assert.equal(result.timestamp, 8886056891);
  });

  it('handles cases when it appears before FCP', async () => {
    trace = preactTrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, gatherContext, settings},
      context);
    assert.equal(Math.round(result.timing), 878);
    assert.equal(result.timestamp, 1805797262960);
  });

  it('handles cases when no FMP exists', async () => {
    trace = noFMPtrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, gatherContext, settings},
      context);
    assert.equal(Math.round(result.timing), 4461);
    assert.equal(result.timestamp, 2146740268666);
  });
});
