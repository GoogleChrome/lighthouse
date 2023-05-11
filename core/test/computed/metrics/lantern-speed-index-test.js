/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as constants from '../../../config/constants.js';
import {LanternSpeedIndex} from '../../../computed/metrics/lantern-speed-index.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

const defaultThrottling = constants.throttling.mobileSlow4G;
const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

describe('Metrics: Lantern Speed Index', () => {
  const gatherContext = {gatherMode: 'navigation'};
  it('should compute predicted value', async () => {
    const settings = {throttlingMethod: 'simulate', throttling: defaultThrottling};
    const context = {settings, computedCache: new Map()};
    const result = await LanternSpeedIndex.request(
      {trace, devtoolsLog, gatherContext, settings, URL},
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

  it('should compute predicted value for different settings', async () => {
    const settings = {throttlingMethod: 'simulate', throttling: {...defaultThrottling, rttMs: 300}};
    const context = {settings, computedCache: new Map()};
    const result = await LanternSpeedIndex.request(
      {trace, devtoolsLog, gatherContext, settings, URL},
      context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchInlineSnapshot(`
      Object {
        "optimistic": 605,
        "pessimistic": 2439,
        "timing": 2198,
      }
    `);
  });

  it('should not scale coefficients at default', async () => {
    const result = LanternSpeedIndex.getScaledCoefficients(defaultThrottling.rttMs);
    expect(result).toEqual(LanternSpeedIndex.COEFFICIENTS);
  });

  it('should scale coefficients back', async () => {
    const result = LanternSpeedIndex.getScaledCoefficients(5);
    expect(result).toEqual({intercept: 0, pessimistic: 0.5, optimistic: 0.5});
  });

  it('should scale coefficients forward', async () => {
    const result = LanternSpeedIndex.getScaledCoefficients(300);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "intercept": 0,
        "optimistic": 2.525,
        "pessimistic": 0.275,
      }
    `);
  });
});
