/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;

const FirstContentfulPaint = require('../../../computed/metrics/first-contentful-paint.js'); // eslint-disable-line max-len
const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Metrics: FCP', () => {
  it('should compute a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request({trace, devtoolsLog, settings}, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
    assert.equal(result.optimisticEstimate.nodeTimings.size, 3);
    assert.equal(result.pessimisticEstimate.nodeTimings.size, 3);
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute an observed value (desktop)', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request({trace, devtoolsLog, settings}, context);

    assert.equal(Math.round(result.timing), 499);
    assert.equal(result.timestamp, 225414670885);
  });

  it('should compute an observed value (mobile)', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await FirstContentfulPaint.request(
      {trace, devtoolsLog, settings, TestedAsMobileDevice: true}, context);

    assert.equal(Math.round(result.timing), 499);
    assert.equal(result.timestamp, 225414670885);
  });
});
