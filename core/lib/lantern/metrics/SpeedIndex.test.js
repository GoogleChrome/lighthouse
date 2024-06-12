/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';
import {readJson} from '../../../test/test-utils.js';
import {getComputationDataFromFixture} from './MetricTestUtils.js';

const {SpeedIndex, FirstContentfulPaint} = Lantern.Metrics;

const trace = readJson('../../../test/fixtures/artifacts/progressive-app/trace.json', import.meta);

const defaultThrottling = Lantern.Simulation.Constants.throttling.mobileSlow4G;

describe('Metrics: Lantern Speed Index', () => {
  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture({trace});
    // TODO: observedSpeedIndex is from the Speedline library, and is used for optimistic
    // mode. At the moment callers must pass the result into Lantern.
    const observedSpeedIndex = 379.04474997520487;
    const result = await SpeedIndex.compute(data, {
      fcpResult: await FirstContentfulPaint.compute(data),
      observedSpeedIndex,
    });

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs)}).
toMatchInlineSnapshot(`
Object {
  "optimistic": 379,
  "pessimistic": 1122,
  "timing": 1107,
}
`);
  });

  it('should compute predicted value for different settings', async () => {
    const settings = {throttlingMethod: 'simulate', throttling: {...defaultThrottling, rttMs: 300}};
    const data = await getComputationDataFromFixture({trace, settings});
    const observedSpeedIndex = 379.04474997520487;
    const result = await SpeedIndex.compute(data, {
      fcpResult: await FirstContentfulPaint.compute(data),
      observedSpeedIndex,
    });

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs)}).
toMatchInlineSnapshot(`
Object {
  "optimistic": 379,
  "pessimistic": 2022,
  "timing": 2007,
}
`);
  });

  it('should not scale coefficients at default', async () => {
    const result = SpeedIndex.getScaledCoefficients(defaultThrottling.rttMs);
    expect(result).toEqual(SpeedIndex.COEFFICIENTS);
  });

  it('should scale coefficients back', async () => {
    const result = SpeedIndex.getScaledCoefficients(5);
    expect(result).toEqual({intercept: 0, pessimistic: 0.5, optimistic: 0.5});
  });

  it('should scale coefficients forward', async () => {
    const result = SpeedIndex.getScaledCoefficients(300);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "intercept": 0,
        "optimistic": 2.525,
        "pessimistic": 0.275,
      }
    `);
  });
});
