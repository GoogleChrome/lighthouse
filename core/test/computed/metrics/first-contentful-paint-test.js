/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {FirstContentfulPaint} from '../../../computed/metrics/first-contentful-paint.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);

const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

describe('Metrics: FCP', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request(
      // eslint-disable-next-line max-len
      {trace, devtoolsLog, gatherContext, settings, URL, SourceMaps: [], HostDPR: 1, simulator: null},
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

  it('should use the last main-frame navigation when earlier navigations aborted', async () => {
    const traceWithAbortedNav = structuredClone(trace);
    const mainNav = traceWithAbortedNav.traceEvents.find(e => e.name === 'navigationStart');
    const abortedNav = structuredClone(mainNav);
    abortedNav.ts = mainNav.ts - 1000;
    abortedNav.args.data.navigationId = 'aborted-initial-nav';
    traceWithAbortedNav.traceEvents.unshift(abortedNav);

    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request(
      {
        trace: traceWithAbortedNav,
        devtoolsLog,
        gatherContext,
        settings,
        URL,
        SourceMaps: [],
        HostDPR: 1,
        simulator: null,
      },
      context);

    assert.equal(Math.round(result.timing), 1107);
  });

  it('should compute an observed value (desktop)', async () => {
    const settings = {throttlingMethod: 'provided', formFactor: 'desktop'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request(
      // eslint-disable-next-line max-len
      {trace, devtoolsLog, gatherContext, settings, URL: getURLArtifactFromDevtoolsLog(devtoolsLog), SourceMaps: [], HostDPR: 1, simulator: null},
      context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 376406173872,
  "timing": 192.308,
}
`);
  });

  it('should compute an observed value (mobile)', async () => {
    const settings = {throttlingMethod: 'provided', formFactor: 'mobile'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request(
      // eslint-disable-next-line max-len
      {gatherContext, trace, devtoolsLog, settings, URL: getURLArtifactFromDevtoolsLog(devtoolsLog), SourceMaps: [], HostDPR: 1, simulator: null},
      context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 376406173872,
  "timing": 192.308,
}
`);
  });
});
