/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Interactive = require('../../../computed/metrics/interactive.js');

const assert = require('assert').strict;

const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

function generateNetworkRecords(records, navStart) {
  const navStartInMs = navStart / 1000;
  return records.map(item => {
    return {
      failed: item.failed || false,
      statusCode: item.statusCode || 200,
      requestMethod: item.requestMethod || 'GET',
      finished: typeof item.finished === 'undefined' ? true : item.finished,
      startTime: (item.start + navStartInMs) / 1000,
      endTime: item.end === -1 ? -1 : (item.end + navStartInMs) / 1000,
    };
  });
}

/* eslint-env jest */
describe('Metrics: TTI', () => {
  it('should compute a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await Interactive.request({trace, devtoolsLog, settings}, context);

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

  it('should compute an observed value (desktop)', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await Interactive.request({trace, devtoolsLog, settings}, context);

    assert.equal(Math.round(result.timing), 1582);
    assert.equal(result.timestamp, 225415754204);
  });

  it('should compute an observed value (mobile)', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await Interactive.request(
      {trace, devtoolsLog, settings, TestedAsMobileDevice: true}, context);

    assert.equal(Math.round(result.timing), 1582);
    assert.equal(result.timestamp, 225415754204);
  });

  describe('#findOverlappingQuietPeriods', () => {
    it('should return entire range when no activity is present', () => {
      const navigationStart = 220023532;
      const firstContentfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstContentfulPaint, traceEnd}};

      const cpu = [];
      const network = generateNetworkRecords([], navigationStart);

      const result = Interactive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      assert.deepEqual(result.cpuQuietPeriod, {start: 0, end: traceEnd / 1000});
      assert.deepEqual(result.networkQuietPeriod, {start: 0, end: traceEnd / 1000});
    });

    it('should throw when trace ended too soon after FMP', () => {
      const navigationStart = 220023532;
      const firstContentfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 5000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstContentfulPaint, traceEnd}};

      const cpu = [];
      const network = generateNetworkRecords([], navigationStart);

      assert.throws(() => {
        Interactive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      }, /NO.*IDLE_PERIOD/);
    });

    it('should throw when CPU is quiet but network is not', () => {
      const navigationStart = 220023532;
      const firstContentfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstContentfulPaint, traceEnd}};

      const cpu = [];
      const network = generateNetworkRecords([
        {start: 1400, end: 1900},
        {start: 2000, end: 9000},
        {start: 2000, end: 8000},
        {start: 2000, end: 8500},
      ], navigationStart);

      assert.throws(() => {
        Interactive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      }, /NO.*NETWORK_IDLE_PERIOD/);
    });

    it('should throw when network is quiet but CPU is not', () => {
      const navigationStart = 220023532;
      const firstContentfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstContentfulPaint, traceEnd}};

      const cpu = [
        {start: 3000, end: 8000},
      ];
      const network = generateNetworkRecords([
        {start: 0, end: 1900},
      ], navigationStart);

      assert.throws(() => {
        Interactive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      }, /NO.*CPU_IDLE_PERIOD/);
    });

    it('should ignore unnecessary network requests', () => {
      const navigationStart = 220023532;
      const firstContentfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstContentfulPaint, traceEnd}};

      const cpu = [];
      let network = generateNetworkRecords([
        {start: 0, end: -1, finished: false},
        {start: 0, end: 11000, failed: true},
        {start: 0, end: 11000, requestMethod: 'POST'},
        {start: 0, end: 11000, statusCode: 500},
      ], navigationStart);
      // Triple the requests to ensure it's not just the 2-quiet kicking in
      network = network.concat(network).concat(network);

      const result = Interactive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      assert.deepEqual(result.cpuQuietPeriod, {start: 0, end: traceEnd / 1000});
      assert.deepEqual(result.networkQuietPeriod, {start: 0, end: traceEnd / 1000});
    });

    it('should find first overlapping quiet period', () => {
      const navigationStart = 220023532;
      const firstContentfulPaint = 10000 * 1000 + navigationStart;
      const traceEnd = 45000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstContentfulPaint, traceEnd}};

      const cpu = [
        // quiet period before FMP
        {start: 9000, end: 9900},
        {start: 11000, end: 13000},
        // quiet period during network activity
        {start: 18500, end: 22000},
        {start: 23500, end: 26000},
        // 2nd quiet period during network activity
        {start: 31500, end: 34000},
        // final quiet period
      ];

      const network = generateNetworkRecords([
        // initial page load + script
        {start: 1400, end: 1900},
        {start: 1900, end: 9000},
        // script requests more content
        {start: 11500, end: 18500},
        {start: 11500, end: 19000},
        {start: 11500, end: 19000},
        {start: 11500, end: 19500},
        // quiet period during Main thread activity
        {start: 28000, end: 32000},
        {start: 28000, end: 32000},
        {start: 28000, end: 35000},
        // final quiet period
      ], navigationStart);

      const result = Interactive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      assert.deepEqual(result.cpuQuietPeriod, {
        start: 34000 + navigationStart / 1000,
        end: traceEnd / 1000,
      });
      assert.deepEqual(result.networkQuietPeriod, {
        start: 32000 + navigationStart / 1000,
        end: traceEnd / 1000,
      });
      assert.equal(result.cpuQuietPeriods.length, 3);
      assert.equal(result.networkQuietPeriods.length, 2);
    });
  });
});
