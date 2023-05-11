/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import assert from 'assert/strict';

import {SpeedIndex} from '../../../computed/metrics/speed-index.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
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
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchInlineSnapshot(`
      Object {
        "optimistic": 605,
        "pessimistic": 1661,
        "timing": 1511,
      }
    `);
  });

  it('should compute a simulated value on a trace on desktop with 1ms durations', async () => {
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

    assert.equal(result.timing, 605);
    assert.equal(result.timestamp, 225414777015);
  });

  it('should compute an observed value (mobile)', async () => {
    const settings = {throttlingMethod: 'provided', formFactor: 'mobile'};
    const context = {settings, computedCache: new Map()};
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const result = await SpeedIndex.request({trace, devtoolsLog, gatherContext, settings, URL},
      context);

    assert.equal(result.timing, 605);
    assert.equal(result.timestamp, 225414777015);
  });
});
