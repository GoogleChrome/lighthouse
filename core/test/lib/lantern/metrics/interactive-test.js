/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {Interactive} from '../../../../lib/lantern/metrics/Interactive.js';
import {FirstContentfulPaint} from '../../../../lib/lantern/metrics/FirstContentfulPaint.js';
import {LargestContentfulPaint} from '../../../../lib/lantern/metrics/LargestContentfulPaint.js';
import {getComputationDataFromFixture} from './MetricTestUtils.js';
import {readJson} from '../../../test-utils.js';

const trace = readJson('../../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const iframeTrace = readJson('../../../fixtures/artifacts/iframe/trace.json', import.meta);

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
