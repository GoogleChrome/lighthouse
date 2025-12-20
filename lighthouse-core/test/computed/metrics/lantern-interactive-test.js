/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LanternInteractive = require('../../../computed/metrics/lantern-interactive.js');
const assert = require('assert').strict;

const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');
const iframeTrace = require('../../fixtures/traces/iframe-m79.trace.json');
const iframeDevtoolsLog = require('../../fixtures/traces/iframe-m79.devtoolslog.json');

/* eslint-env jest */

describe('Metrics: Lantern TTI', () => {
  it('should compute predicted value', async () => {
    const settings = {};
    const context = {settings, computedCache: new Map()};
    const result = await LanternInteractive.request({trace, devtoolsLog,
      settings}, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
    assert.equal(result.optimisticEstimate.nodeTimings.size, 19);
    assert.equal(result.pessimisticEstimate.nodeTimings.size, 80);
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should compute predicted value on iframes with substantial layout', async () => {
    const settings = {};
    const context = {settings, computedCache: new Map()};
    const result = await LanternInteractive.request({
      trace: iframeTrace,
      devtoolsLog: iframeDevtoolsLog,
      settings,
    }, context);

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchSnapshot();
    assert.ok(result.optimisticGraph, 'should have created optimistic graph');
    assert.ok(result.pessimisticGraph, 'should have created pessimistic graph');
  });
});
