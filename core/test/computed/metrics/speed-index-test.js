/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {SpeedIndex} from '../../../computed/metrics/speed-index.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);
const trace1msLayout = readJson('../../fixtures/traces/speedindex-1ms-layout-m84.trace.json', import.meta);
const devtoolsLog1msLayout = readJson('../../fixtures/traces/speedindex-1ms-layout-m84.devtoolslog.json', import.meta); // eslint-disable-line max-len

describe('Metrics: Speed Index', () => {
  const gatherContext = {gatherMode: 'navigation'};

  it('should compute a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await SpeedIndex.request({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs)}).toMatchInlineSnapshot(`
Object {
  "optimistic": 379,
  "pessimistic": 1122,
  "timing": 1107,
}
`);
  });

  it('should compute a simulated value on a trace on desktop with 1ms durations', async () => {
    // TODO(15841): trace needs updating.
    if (process.env.INTERNAL_LANTERN_USE_TRACE !== undefined) {
      return;
    }

    const settings = {
      throttlingMethod: 'simulate',
      throttling: {
        cpuSlowdownMultiplier: 1,
        rttMs: 40,
        throughputKbps: 10240,
      },
    };

    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog1msLayout);
    const context = {settings, computedCache: new Map()};
    const result = await SpeedIndex.request(
      {
        gatherContext,
        trace: trace1msLayout,
        devtoolsLog: devtoolsLog1msLayout,
        settings,
        URL,
      },
      context
    );

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchInlineSnapshot(`
      Object {
        "optimistic": 575,
        "pessimistic": 633,
        "timing": 642,
      }
    `);
  });

  it('should compute an observed value (desktop)', async () => {
    const settings = {throttlingMethod: 'provided', formFactor: 'desktop'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await SpeedIndex.request({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 376406360564,
  "timing": 379,
}
`);
  });

  it('should compute an observed value (mobile)', async () => {
    const settings = {throttlingMethod: 'provided', formFactor: 'mobile'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await SpeedIndex.request({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    await expect(result).toMatchInlineSnapshot(`
Object {
  "timestamp": 376406360564,
  "timing": 379,
}
`);
  });
});
