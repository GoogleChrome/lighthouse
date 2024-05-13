/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as constants from '../../../../config/constants.js';
import {LanternSpeedIndex} from '../../../../computed/metrics/lantern-speed-index.js';
import {readJson} from '../../../test-utils.js';
import {SpeedIndex} from '../../../../lib/lantern/metrics/speed-index.js';
import {FirstContentfulPaint} from '../../../../lib/lantern/metrics/first-contentful-paint.js';
import {getComputationDataFromFixture} from './metric-test-utils.js';
import {Speedline} from '../../../../computed/speedline.js';

const trace = readJson('../../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const devtoolsLog = readJson('../../../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);

const defaultThrottling = constants.throttling.mobileSlow4G;

describe('Metrics: Lantern Speed Index', () => {
  it('should compute predicted value', async () => {
    const context = {computedCache: new Map()};
    const data = await getComputationDataFromFixture({trace, devtoolsLog});
    const result = await SpeedIndex.compute(data, {
      fcpResult: await FirstContentfulPaint.compute(data),
      speedline: await Speedline.request(trace, context),
    });

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs)}).
toMatchInlineSnapshot(`
Object {
  "optimistic": 307,
  "pessimistic": 1076,
  "timing": 1033,
}
`);
  });

  it('should compute predicted value for different settings', async () => {
    const settings = {throttlingMethod: 'simulate', throttling: {...defaultThrottling, rttMs: 300}};
    const context = {computedCache: new Map()};
    const data = await getComputationDataFromFixture({trace, devtoolsLog, settings});
    const result = await SpeedIndex.compute(data, {
      fcpResult: await FirstContentfulPaint.compute(data),
      speedline: await Speedline.request(trace, context),
    });

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs)}).
toMatchInlineSnapshot(`
Object {
  "optimistic": 307,
  "pessimistic": 1976,
  "timing": 1933,
}
`);
  });

  it('should not scale coefficients at default', async () => {
    const result = LanternSpeedIndex.getScaledCoefficients(defaultThrottling.rttMs);
    expect(result).toEqual(LanternSpeedIndex.COEFFICIENTS);
  });

  it('should scale coefficients back', async () => {
    const result = LanternSpeedIndex.getScaledCoefficients(5);
    expect(result).toEqual({intercept: 0, pessimistic: 0.5, optimistic: 0.5});
  });

  it('should scale coefficients forward', async () => {
    const result = LanternSpeedIndex.getScaledCoefficients(300);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "intercept": 0,
        "optimistic": 2.525,
        "pessimistic": 0.275,
      }
    `);
  });
});
