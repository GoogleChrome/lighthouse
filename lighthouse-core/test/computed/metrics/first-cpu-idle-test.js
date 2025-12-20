/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FirstCPUIdle = require('../../../computed/metrics/first-cpu-idle.js');
const TracingProcessor = require('../../../lib/tracehouse/trace-processor.js');

const tooShortTrace = require('../../fixtures/traces/progressive-app.json');
const acceptableTrace = require('../../fixtures/traces/progressive-app-m60.json');
const acceptableDevtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json'); // eslint-disable-line max-len
const redirectTrace = require('../../fixtures/traces/site-with-redirect.json');

const assert = require('assert').strict;

/* eslint-env jest */
describe('FirstInteractive computed artifact:', () => {
  let trace;
  let settings;
  let devtoolsLog;
  let context;

  beforeEach(() => {
    settings = {throttlingMethod: 'provided'};
    devtoolsLog = [];
    context = {settings, computedCache: new Map()};
  });

  it('throws on short traces', () => {
    trace = {traceEvents: tooShortTrace};
    return FirstCPUIdle.request({trace, devtoolsLog, settings}, context).then(() => {
      assert.ok(false, 'should have thrown for short trace');
    }).catch(err => {
      assert.equal(err.message, 'FMP_TOO_LATE_FOR_FCPUI');
    });
  });

  it('should compute firstInteractive', () => {
    trace = acceptableTrace;
    return FirstCPUIdle.request({trace, devtoolsLog, settings}, context).then(output => {
      assert.equal(Math.round(output.timing), 1582);
      assert.ok(output.timestamp, 'output is missing timestamp');
    });
  });

  it('should compute firstInteractive on pages with redirect', () => {
    trace = redirectTrace;
    return FirstCPUIdle.request({trace, devtoolsLog, settings}, context).then(output => {
      assert.equal(Math.round(output.timing), 2712);
      assert.ok(output.timestamp, 'output is missing timestamp');
    });
  });

  it('should simulate when settings specify', async () => {
    settings = {throttlingMethod: 'simulate'};
    trace = acceptableTrace;
    devtoolsLog = acceptableDevtoolsLog;

    const result = await FirstCPUIdle.request({trace, devtoolsLog, settings}, context);

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

  describe('#computeObservedMetric', () => {
    let mainThreadEvents;
    let originalMainThreadEventsFunc;
    let computeObservedMetric;

    beforeAll(() => {
      originalMainThreadEventsFunc = TracingProcessor.getMainThreadTopLevelEvents;
      TracingProcessor.getMainThreadTopLevelEvents = () => mainThreadEvents
          .map(evt => Object.assign(evt, {duration: evt.end - evt.start}));
      computeObservedMetric = traceOfTab => FirstCPUIdle.computeObservedMetric({traceOfTab});
    });

    afterAll(() => {
      TracingProcessor.getMainThreadTopLevelEvents = originalMainThreadEventsFunc;
    });

    it('should throw when trace is not long enough after FMP', () => {
      expect(computeObservedMetric({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 2000,
          traceEnd: 4500,
        },
        timestamps: {
          navigationStart: 0,
        },
      })).rejects.toThrow(/FMP_TOO_LATE/);
    });

    it('should return FMP when no trace events are found', async () => {
      mainThreadEvents = [];

      const result = await computeObservedMetric({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 2000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 600 * 1000,
        },
      });

      assert.equal(result.timing, 3400);
      assert.equal(result.timestamp, 4000000);
    });

    it('should not return a time earlier than FMP', async () => {
      mainThreadEvents = [];

      const result = await computeObservedMetric({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 2000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timing, 3400);
    });

    it('should return DCL when DCL is after FMP', async () => {
      mainThreadEvents = [];

      const result = await computeObservedMetric({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 7000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timing, 7000);
    });

    it('should return DCL when DCL is after interactive', async () => {
      mainThreadEvents = [
        {start: 5000, end: 5100},
      ];

      const result = await computeObservedMetric({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 7000,
          traceEnd: 12000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timing, 7000);
    });

    it('should return the quiet window', async () => {
      mainThreadEvents = [
        {start: 4000, end: 4200},
        {start: 9000, end: 9500},
        {start: 12000, end: 12100}, // light task
      ];

      const result = await computeObservedMetric({
        timings: {
          firstMeaningfulPaint: 3400,
          domContentLoaded: 2300,
          traceEnd: 24000,
        },
        timestamps: {
          navigationStart: 0,
        },
      });

      assert.equal(result.timing, 9500);
    });
  });

  describe('#findQuietWindow', () => {
    it('should return FMP when there are no long tasks', () => {
      const result = FirstCPUIdle.findQuietWindow(200, 1000, []);
      assert.equal(result, 200);
    });

    it('should return FMP when long tasks are more than 5s out', () => {
      const longTasks = [{start: 5600, end: 6000}];
      const result = FirstCPUIdle.findQuietWindow(200, 60000, longTasks);
      assert.equal(result, 200);
    });

    it('should return first empty window of 5s', () => {
      const longTasks = [
        {start: 2200, end: 4000},
        {start: 9000, end: 10000},
      ];
      const result = FirstCPUIdle.findQuietWindow(200, 60000, longTasks);
      assert.equal(result, 4000);
    });

    it('should allow smaller windows farther away', () => {
      const longTasks = [
        {start: 2200, end: 15000},
        {start: 18500, end: 20000}, // window of only 3.5 seconds
      ];
      const result = FirstCPUIdle.findQuietWindow(200, 60000, longTasks);
      assert.equal(result, 15000);
    });

    it('should allow light task clusters', () => {
      const longTasks = [
        {start: 2200, end: 10000},
        {start: 11000, end: 11500},

        // first light task cluster
        {start: 12750, end: 12825},
        {start: 12850, end: 12930},
        {start: 12935, end: 12990},

        // second light task cluster
        {start: 14000, end: 14200},
      ];
      const result = FirstCPUIdle.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 11500);
    });

    it('should allow heavy clusters after a long quiet period', () => {
      const longTasks = [
        {start: 5000, end: 5100},
        {start: 10500, end: 12000},
        {start: 12500, end: 16500},
      ];

      const result = FirstCPUIdle.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 5100);
    });

    it('should not allow tasks in the first 5s after FMP to be light', () => {
      const longTasks = [
        {start: 2200, end: 10000},
        {start: 11000, end: 11500},

        // first light task cluster
        {start: 12750, end: 12825},
        {start: 12850, end: 12930},
        {start: 12935, end: 12990},
      ];

      const result = FirstCPUIdle.findQuietWindow(10000, 60000, longTasks);
      assert.equal(result, 12990);
    });

    it('should not allow large tasks in light cluster', () => {
      const longTasks = [
        {start: 2200, end: 10000},
        {start: 11000, end: 11500},

        // first light task cluster
        {start: 12750, end: 12825},
        {start: 12850, end: 12930},
        {start: 12935, end: 12990},

        {start: 14000, end: 17000},
      ];

      const result = FirstCPUIdle.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 17000);
    });

    it('should not allow start of cluster to be first quiet', () => {
      const longTasks = [
        {start: 10000, end: 10500},
        {start: 10600, end: 10700},
      ];

      const result = FirstCPUIdle.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 10700);
    });

    it('should not allow heavy clusters at the very end of a window', () => {
      const longTasks = [
        {start: 5000, end: 5100},
        {start: 10050, end: 10100},
        {start: 10500, end: 16500},
      ];

      const result = FirstCPUIdle.findQuietWindow(5000, 60000, longTasks);
      assert.equal(result, 16500);
    });

    it('should throw when long tasks are too close to traceEnd', () => {
      const longTasks = [{start: 4000, end: 5700}];
      assert.throws(() => {
        FirstCPUIdle.findQuietWindow(200, 6000, longTasks);
      }, /NO.*IDLE_PERIOD/);
    });
  });
});
