/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {readJson} from '../../../test-utils.js';
import {FirstMeaningfulPaint} from '../../../../lib/lantern/metrics/first-meaningful-paint.js';
import {getComputationDataFromFixture} from './metric-test-utils.js';

const trace = readJson('../../../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

describe('Metrics: Lantern FMP', () => {
  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture({trace, devtoolsLog});
    const result = await FirstMeaningfulPaint.compute(data);

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
});
