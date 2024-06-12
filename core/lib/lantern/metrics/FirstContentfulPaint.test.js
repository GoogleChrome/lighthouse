/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from '../lantern.js';
import {readJson} from '../../../test/test-utils.js';
import {getComputationDataFromFixture} from './MetricTestUtils.js';

const {FirstContentfulPaint} = Lantern.Metrics;

const trace = readJson('../../../test/fixtures/artifacts/progressive-app/trace.json', import.meta);

describe('Metrics: Lantern FCP', () => {
  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture({trace});
    const result = await FirstContentfulPaint.compute(data);

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

  it('should handle negative request networkEndTime', async () => {
    const data = await getComputationDataFromFixture({trace});
    data.graph.request.networkEndTime = -1;
    const result = await FirstContentfulPaint.compute(data);

    const optimisticNodes = [];
    result.optimisticGraph.traverse(node => {
      if (node.type === 'network') {
        optimisticNodes.push(node);
      }
    });
    expect(optimisticNodes.map(node => node.request.url)).toEqual(['https://squoosh.app/']);

    const pessimisticNodes = [];
    result.pessimisticGraph.traverse(node => {
      if (node.type === 'network') {
        pessimisticNodes.push(node);
      }
    });
    expect(pessimisticNodes.map(node => node.request.url)).toEqual(['https://squoosh.app/']);
  });
});
