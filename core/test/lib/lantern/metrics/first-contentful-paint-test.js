/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {FirstContentfulPaint} from '../../../../lib/lantern/metrics/first-contentful-paint.js';
import {readJson} from '../../../test-utils.js';
import {networkRecordsToDevtoolsLog} from '../../../network-records-to-devtools-log.js';
import {createTestTrace} from '../../../create-test-trace.js';
import {getComputationDataFromFixture} from './metric-test-utils.js';

const trace = readJson('../../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const devtoolsLog = readJson('../../../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);

describe('Metrics: Lantern FCP', () => {
  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture({trace, devtoolsLog});
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
    const devtoolsLog = networkRecordsToDevtoolsLog([
      {
        transferSize: 2000,
        url: 'https://example.com/', // Main document (always included).
        resourceType: 'Document',
        priority: 'High',
        networkRequestTime: 0,
        networkEndTime: 1000,
        timing: {sslStart: 50, sslEnd: 100, connectStart: 50, connectEnd: 100},
      },
      {
        transferSize: 2000,
        url: 'https://example.com/script.js',
        resourceType: 'Script',
        priority: 'High',
        networkRequestTime: 1000, // After FCP.
        networkEndTime: -1,
        timing: {sslStart: 50, sslEnd: 100, connectStart: 50, connectEnd: 100},
      },
    ]);
    const trace = createTestTrace({timeOrigin: 0, traceEnd: 2000});
    const URL = {
      requestedUrl: 'https://example.com/',
      mainDocumentUrl: 'https://example.com/',
      finalDisplayedUrl: 'https://example.com/',
    };
    const data = await getComputationDataFromFixture({trace, devtoolsLog, URL});
    const result = await FirstContentfulPaint.compute(data);

    const optimisticNodes = [];
    result.optimisticGraph.traverse(node => optimisticNodes.push(node));
    expect(optimisticNodes.map(node => node.record.url)).toEqual(['https://example.com/']);

    const pessimisticNodes = [];
    result.pessimisticGraph.traverse(node => pessimisticNodes.push(node));
    expect(pessimisticNodes.map(node => node.record.url)).toEqual(['https://example.com/']);
  });
});
