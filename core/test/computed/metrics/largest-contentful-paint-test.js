/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LargestContentfulPaint} from '../../../computed/metrics/largest-contentful-paint.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/paul/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/paul/devtoolslog.json', import.meta);
const invalidTrace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const invalidDevtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

describe('Metrics: LCP', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute predicted value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await LargestContentfulPaint.request({trace, devtoolsLog, gatherContext,
      settings, URL}, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs)}).
toMatchInlineSnapshot(`
Object {
  "optimistic": 1445,
  "pessimistic": 1603,
  "timing": 1524,
}
`);
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await LargestContentfulPaint.request({trace, devtoolsLog, gatherContext,
      settings, URL}, context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 343577475882,
  "timing": 291.834,
}
`);
  });

  ['provided', 'simulate'].forEach(throttlingMethod => {
    it(`should fail to compute a value for old trace (${throttlingMethod})`, async () => {
      const settings = {throttlingMethod};
      const context = {settings, computedCache: new Map()};
      const URL = getURLArtifactFromDevtoolsLog(invalidDevtoolsLog);
      const resultPromise = LargestContentfulPaint.request(
        {gatherContext, trace: invalidTrace, devtoolsLog: invalidDevtoolsLog, settings, URL},
        context
      );
      await expect(resultPromise).rejects.toMatchObject({
        code: 'NO_LCP',
        friendlyMessage: expect.toBeDisplayString(/The page did not display content.*NO_LCP/),
      });
    });
  });
});
