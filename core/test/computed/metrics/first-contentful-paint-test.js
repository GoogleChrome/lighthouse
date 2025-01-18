/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {FirstContentfulPaint} from '../../../computed/metrics/first-contentful-paint.js'; // eslint-disable-line max-len
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
    const settings = {throttlingMethod: 'provided', formFactor: 'desktop'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request({trace, devtoolsLog, gatherContext, settings},
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
      {gatherContext, trace, devtoolsLog, settings}, context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 376406173872,
  "timing": 192.308,
}
`);
  });
});
