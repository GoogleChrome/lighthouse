/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;

const LargestContentfulPaint = require('../../../computed/metrics/largest-contentful-paint.js'); // eslint-disable-line max-len
const trace = require('../../fixtures/traces/lcp-m78.json');
const devtoolsLog = require('../../fixtures/traces/lcp-m78.devtools.log.json');
const invalidTrace = require('../../fixtures/traces/progressive-app-m60.json');
const invalidDevtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Metrics: LCP', () => {
  it('should compute predicted value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await LargestContentfulPaint.request({trace, devtoolsLog, settings}, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchInlineSnapshot(`
      Object {
        "optimistic": 2289,
        "pessimistic": 3228,
        "timing": 2758,
      }
    `);
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await LargestContentfulPaint.request({trace, devtoolsLog, settings}, context);

    assert.equal(Math.round(result.timing), 1122);
    assert.equal(result.timestamp, 713038144775);
  });

  it('should fail to compute an observed value for old trace', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const resultPromise = LargestContentfulPaint.request(
      {trace: invalidTrace, devtoolsLog: invalidDevtoolsLog, settings},
      context
    );
    await expect(resultPromise).rejects.toThrow('NO_LCP');
  });
});
