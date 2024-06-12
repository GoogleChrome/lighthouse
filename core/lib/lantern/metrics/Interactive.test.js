/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture} from './MetricTestUtils.js';
import {readJson} from '../../../test/test-utils.js';

const {Interactive, FirstContentfulPaint, LargestContentfulPaint} = Lantern.Metrics;

const trace = readJson('../../../test/fixtures/artifacts/progressive-app/trace.json', import.meta);
const iframeTrace = readJson('../../../test/fixtures/artifacts/iframe/trace.json', import.meta);

describe('Metrics: Lantern TTI', () => {
  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture({trace});
    const result = await Interactive.compute(data, {
      lcpResult: await LargestContentfulPaint.compute(data, {
        fcpResult: await FirstContentfulPaint.compute(data),
      }),
    });

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
    assert.equal(result.optimisticEstimate.nodeTimings.size, 14);
    assert.equal(result.pessimisticEstimate.nodeTimings.size, 31);
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute predicted value on iframes with substantial layout', async () => {
    const data = await getComputationDataFromFixture({
      trace: iframeTrace,
    });
    const result = await Interactive.compute(data, {
      lcpResult: await LargestContentfulPaint.compute(data, {
        fcpResult: await FirstContentfulPaint.compute(data),
      }),
    });

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });
});
