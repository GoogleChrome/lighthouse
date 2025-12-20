/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TimingSummary = require('../../../computed/metrics/timing-summary.js');

const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */
describe('Timing summary', () => {
  it('contains the correct data', async () => {
    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const result = await TimingSummary.request({trace, devtoolsLog}, context);

    expect(result.metrics).toMatchInlineSnapshot(`
      Object {
        "cumulativeLayoutShift": 0,
        "estimatedInputLatency": 77.79999999999995,
        "estimatedInputLatencyTs": undefined,
        "firstCPUIdle": 3351.3320000492963,
        "firstCPUIdleTs": undefined,
        "firstContentfulPaint": 1336.6100000208244,
        "firstContentfulPaintTs": undefined,
        "firstMeaningfulPaint": 1553.2040000472914,
        "firstMeaningfulPaintTs": undefined,
        "interactive": 3426.8545000551967,
        "interactiveTs": undefined,
        "largestContentfulPaint": undefined,
        "largestContentfulPaintTs": undefined,
        "maxPotentialFID": 396.0000000000001,
        "observedCumulativeLayoutShift": 0,
        "observedDomContentLoaded": 560.294,
        "observedDomContentLoadedTs": 225414732309,
        "observedFirstContentfulPaint": 498.87,
        "observedFirstContentfulPaintTs": 225414670885,
        "observedFirstMeaningfulPaint": 783.328,
        "observedFirstMeaningfulPaintTs": 225414955343,
        "observedFirstPaint": 498.853,
        "observedFirstPaintTs": 225414670868,
        "observedFirstVisualChange": 520,
        "observedFirstVisualChangeTs": 225414692015,
        "observedLargestContentfulPaint": undefined,
        "observedLargestContentfulPaintTs": undefined,
        "observedLastVisualChange": 818,
        "observedLastVisualChangeTs": 225414990015,
        "observedLoad": 2198.898,
        "observedLoadTs": 225416370913,
        "observedNavigationStart": 0,
        "observedNavigationStartTs": 225414172015,
        "observedSpeedIndex": 604.7093900063634,
        "observedSpeedIndexTs": 225414776724.39,
        "observedTraceEnd": 12539.872,
        "observedTraceEndTs": 225426711887,
        "speedIndex": 1676.1335047609864,
        "speedIndexTs": undefined,
        "totalBlockingTime": 726.4774999940994,
      }
    `);
    // Includes performance metrics
    expect(result.metrics.firstContentfulPaint).toBeDefined();
    // Includes timestamps from trace of tab
    expect(result.metrics.observedFirstContentfulPaint).toBeDefined();
    // Includs visual metrics from Speedline
    expect(result.metrics.observedFirstVisualChange).toBeDefined();

    expect(result.debugInfo).toEqual({lcpInvalidated: false});
  });
});
