/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {MaxPotentialFID} from '../../../computed/metrics/max-potential-fid.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);

const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

describe('Metrics: Max Potential FID', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await MaxPotentialFID.request({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await MaxPotentialFID.request({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timing": 16,
}
`);
  });
});
