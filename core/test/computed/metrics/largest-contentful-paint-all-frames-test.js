/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {LargestContentfulPaintAllFrames} from '../../../computed/metrics/largest-contentful-paint-all-frames.js';
import {readJson} from '../../test-utils.js';

const traceAllFrames = readJson('../../fixtures/traces/frame-metrics-m89.json', import.meta);
const devtoolsLogAllFrames = readJson('../../fixtures/traces/frame-metrics-m89.devtools.log.json', import.meta);
const traceMainFrame = readJson('../../fixtures/artifacts/paul/trace.json', import.meta);
const devtoolsLogMainFrame = readJson('../../fixtures/artifacts/paul/devtoolslog.json', import.meta);
const invalidTrace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const invalidDevtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

describe('Metrics: LCP from all frames', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should throw for predicted value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const resultPromise = LargestContentfulPaintAllFrames.request({gatherContext, trace: traceAllFrames, devtoolsLog: devtoolsLogAllFrames, settings}, context); // eslint-disable-line max-len

    // TODO: Implement lantern solution for LCP all frames.
    await expect(resultPromise).rejects.toThrow();
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await LargestContentfulPaintAllFrames.request({gatherContext, trace: traceAllFrames, devtoolsLog: devtoolsLogAllFrames, settings}, context); // eslint-disable-line max-len

    assert.equal(Math.round(result.timing), 683);
    assert.equal(result.timestamp, 23466705983);
  });

  it('should fail to compute an observed value for old trace', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const resultPromise = LargestContentfulPaintAllFrames.request(
      {gatherContext, trace: invalidTrace, devtoolsLog: invalidDevtoolsLog, settings},
      context
    );
    await expect(resultPromise).rejects.toThrow('NO_LCP_ALL_FRAMES');
  });

  it('should use main frame LCP if no other frames', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await LargestContentfulPaintAllFrames.request(
      {gatherContext, trace: traceMainFrame, devtoolsLog: devtoolsLogMainFrame, settings},
      context
    );
    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 343577475882,
  "timing": 291.834,
}
`);
  });
});
