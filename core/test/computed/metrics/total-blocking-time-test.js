/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {TotalBlockingTime} from '../../../computed/metrics/total-blocking-time.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/blocking-time/trace.json.gz', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/blocking-time/devtoolslog.json.gz', import.meta);
const cnnTrace = readJson('../../fixtures/artifacts/cnn/defaultPass.trace.json.gz', import.meta);
const cnnDevtoolsLog = readJson('../../fixtures/artifacts/cnn/defaultPass.devtoolslog.json.gz', import.meta);

const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

describe('Metrics: TotalBlockingTime', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await TotalBlockingTime.request(
      {trace, devtoolsLog, gatherContext, settings, URL},
      context
    );

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchInlineSnapshot(`
      Object {
        "optimistic": 6765,
        "pessimistic": 6775,
        "timing": 6770,
      }
    `);
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await TotalBlockingTime.request(
      {trace: cnnTrace, devtoolsLog: cnnDevtoolsLog, gatherContext, settings, URL},
      context
    );
    expect(result.timing).toBeCloseTo(400, 1);
  });
});
