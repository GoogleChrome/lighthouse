/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FirstMeaningfulPaint = require('../../../computed/metrics/first-meaningful-paint.js');
const assert = require('assert').strict;

const TRACE_FIXTURES = '../../fixtures/traces';
const pwaTrace = require(`${TRACE_FIXTURES}/progressive-app-m60.json`);
const pwaDevtoolsLog = require(`${TRACE_FIXTURES}/progressive-app-m60.devtools.log.json`);

const badNavStartTrace = require(`${TRACE_FIXTURES}/bad-nav-start-ts.json`);
const lateTracingStartedTrace = require(`${TRACE_FIXTURES}/tracingstarted-after-navstart.json`);
const preactTrace = require(`${TRACE_FIXTURES}/preactjs.com_ts_of_undefined.json`);
const noFMPtrace = require(`${TRACE_FIXTURES}/no_fmp_event.json`);

/* eslint-env jest */

describe('Metrics: FMP', () => {
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

    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, settings}, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
    assert.equal(result.optimisticEstimate.nodeTimings.size, 6);
    assert.equal(result.pessimisticEstimate.nodeTimings.size, 9);
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute an observed value (desktop)', async () => {
    settings = {throttlingMethod: 'provided'};
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, settings}, context);

    assert.equal(Math.round(result.timing), 783);
    assert.equal(result.timestamp, 225414955343);
  });

  it('should compute an observed value (mobile)', async () => {
    settings = {throttlingMethod: 'provided'};
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request(
      {trace, devtoolsLog, settings, TestedAsMobileDevice: true}, context);

    assert.equal(Math.round(result.timing), 783);
    assert.equal(result.timestamp, 225414955343);
  });

  it('handles cases when there was a tracingStartedInPage after navStart', async () => {
    trace = lateTracingStartedTrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, settings}, context);
    assert.equal(Math.round(result.timing), 530);
    assert.equal(result.timestamp, 29344070867);
  });

  it('handles cases when there was a tracingStartedInPage after navStart #2', async () => {
    trace = badNavStartTrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, settings}, context);
    assert.equal(Math.round(result.timing), 632);
    assert.equal(result.timestamp, 8886056891);
  });

  it('handles cases when it appears before FCP', async () => {
    trace = preactTrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, settings}, context);
    assert.equal(Math.round(result.timing), 878);
    assert.equal(result.timestamp, 1805797262960);
  });

  it('handles cases when no FMP exists', async () => {
    trace = noFMPtrace;
    addEmptyTask();
    const context = {computedCache: new Map()};
    const result = await FirstMeaningfulPaint.request({trace, devtoolsLog, settings}, context);
    assert.equal(Math.round(result.timing), 4461);
    assert.equal(result.timestamp, 2146740268666);
  });
});
