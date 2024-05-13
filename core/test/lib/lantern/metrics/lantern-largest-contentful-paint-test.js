/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {LargestContentfulPaint} from '../../../../lib/lantern/metrics/largest-contentful-paint.js';
import {FirstContentfulPaint} from '../../../../lib/lantern/metrics/first-contentful-paint.js';
import {getComputationDataFromFixture} from './metric-test-utils.js';
import {readJson} from '../../../test-utils.js';

const trace = readJson('../../../fixtures/artifacts/paul/trace.json', import.meta);
const devtoolsLog = readJson('../../../fixtures/artifacts/paul/devtoolslog.json', import.meta);

describe('Metrics: Lantern LCP', () => {
  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture({trace, devtoolsLog});
    const result = await LargestContentfulPaint.compute(data, {
      fcpResult: await FirstContentfulPaint.compute(data),
    });

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
      optimisticNodeTimings: result.optimisticEstimate.nodeTimings.size,
      pessimisticNodeTimings: result.pessimisticEstimate.nodeTimings.size}).
toMatchInlineSnapshot(`
Object {
  "optimistic": 1445,
  "optimisticNodeTimings": 8,
  "pessimistic": 1603,
  "pessimisticNodeTimings": 9,
  "timing": 1524,
}
`);
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });
});
