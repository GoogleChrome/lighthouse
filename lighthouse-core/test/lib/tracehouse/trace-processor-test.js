/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TraceProcessor = require('../../../lib/tracehouse/trace-processor.js');

const assert = require('assert').strict;
const fs = require('fs');
const createTestTrace = require('../../create-test-trace.js');
const pwaTrace = require('../../fixtures/traces/progressive-app.json');
const badNavStartTrace = require('../../fixtures/traces/bad-nav-start-ts.json');
const lateTracingStartedTrace = require('../../fixtures/traces/tracingstarted-after-navstart.json');
const noTracingStartedTrace = require('../../fixtures/traces/no-tracingstarted-m74.json');
const preactTrace = require('../../fixtures/traces/preactjs.com_ts_of_undefined.json');
const noFMPtrace = require('../../fixtures/traces/no_fmp_event.json');
const noFCPtrace = require('../../fixtures/traces/airhorner_no_fcp.json');
const noNavStartTrace = require('../../fixtures/traces/no_navstart_event.json');
const backgroundTabTrace = require('../../fixtures/traces/backgrounded-tab-missing-paints.json');
const lcpTrace = require('../../fixtures/traces/lcp-m78.json');

/* eslint-env jest */

describe('TraceProcessor', () => {
  describe('_riskPercentiles', () => {
    const defaultPercentiles = [0, 0.25, 0.5, 0.75, 0.9, 0.99, 1];

    /**
     * Create a riskPercentiles result object by matching the values in percentiles
     * and times.
     * @param {!Array<number>} percentiles
     * @param {!Array<number>} times
     * @return {!Array<{percentile: number, time: number}>}
     */
    function createRiskPercentiles(percentiles, times) {
      return percentiles.map((percentile, index) => {
        return {
          percentile,
          time: times[index],
        };
      });
    }

    it('correctly calculates percentiles of no tasks', () => {
      const results = TraceProcessor._riskPercentiles([], 100, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 16, 16, 16, 16, 16]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of a single task with idle time', () => {
      const results = TraceProcessor._riskPercentiles([50], 100, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 16, 41, 56, 65, 66]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of a single task with no idle time', () => {
      const results = TraceProcessor._riskPercentiles([50], 50, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 28.5, 41, 53.5, 61, 65.5, 66]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of several equal-length tasks', () => {
      const results = TraceProcessor._riskPercentiles([50, 50, 50, 50], 400, defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 16, 41, 56, 65, 66]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of tasks including zero-length durations', () => {
      const results = TraceProcessor._riskPercentiles([0, 0, 0, 10, 20, 20, 30, 30, 120], 320,
          defaultPercentiles);
      const expected = createRiskPercentiles(defaultPercentiles, [16, 16, 28, 56, 104, 132.8, 136]);
      assert.deepEqual(results, expected);
    });

    // Three tasks of one second each, all within a five-second window.
    // Mean Queueing Time of 300ms.
    it('correctly calculates percentiles of three one-second tasks in a five-second window', () => {
      const results = TraceProcessor._riskPercentiles([1000, 1000, 1000], 5000,
          defaultPercentiles, 0);
      // Round to hundredths to simplify floating point comparison.
      results.forEach(result => {
        result.time = Number(result.time.toFixed(2));
      });

      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 16, 182.67, 599.33, 849.33, 999.33, 1016]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates percentiles of tasks with a clipped task', () => {
      const results = TraceProcessor._riskPercentiles([10, 20, 50, 60, 90, 100], 300,
          defaultPercentiles, 30);
      // Round to hundredths to simplify floating point comparison.
      results.forEach(result => {
        result.time = Number(result.time.toFixed(2));
      });

      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 32.25, 53.5, 74.33, 96, 113, 116]);
      assert.deepEqual(results, expected);
    });

    // One 20 second long task over three five-second windows.
    it('correctly calculates percentiles of single task over multiple windows', () => {
      // Starts 3 seconds into the first window. Mean Queueing Time = 7600ms.
      const TASK_LENGTH = 20000;
      const results1 = TraceProcessor._riskPercentiles([TASK_LENGTH], 5000,
          defaultPercentiles, TASK_LENGTH - 2000);
      const expected1 = createRiskPercentiles(defaultPercentiles,
          [16, 16, 16, 18766, 19516, 19966, 20016]);
      assert.deepEqual(results1, expected1);

      // Starts 2 seconds before and ends 13 seconds after. Mean Queueing Time = 15500ms.
      const results2 = TraceProcessor._riskPercentiles([TASK_LENGTH - 2000], 5000,
          defaultPercentiles, TASK_LENGTH - 7000);
      const expected2 = createRiskPercentiles(defaultPercentiles,
          [16, 14266, 15516, 16766, 17516, 17966, 18016]);
      assert.deepEqual(results2, expected2);

      // Starts 17 seconds before and ends 3 seconds into the window. Mean Queueing Time = 900ms.
      const results3 = TraceProcessor._riskPercentiles([TASK_LENGTH - 17000], 5000,
          defaultPercentiles, 0);
      const expected3 = createRiskPercentiles(defaultPercentiles,
          [16, 16, 516, 1766, 2516, 2966, 3016]);
      assert.deepEqual(results3, expected3);
    });

    it('correctly calculates with a task shorter than the clipped length of another', () => {
      const results = TraceProcessor._riskPercentiles([40, 100], 100,
          defaultPercentiles, 50);
      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 31, 56, 91, 106, 115, 116]);
      assert.deepEqual(results, expected);
    });

    it('correctly calculates with a task clipped completely', () => {
      const results = TraceProcessor._riskPercentiles([40, 100], 100,
          defaultPercentiles, 100);
      const expected = createRiskPercentiles(defaultPercentiles,
          [16, 16, 16, 31, 46, 55, 56]);
      assert.deepEqual(results, expected);
    });

    it('does not divide by zero when duration sum is less than whole', () => {
      // Durations chosen such that, due to floating point error:
      //   const idleTime = totalTime - (duration1 + duration2);
      //   (idleTime + duration1 + duration2) < totalTime
      const duration1 = 67 / 107;
      const duration2 = 67 / 53;
      const totalTime = 10;
      const results = TraceProcessor._riskPercentiles([duration1, duration2], totalTime, [1], 0);
      const expected = createRiskPercentiles([1], [16 + duration2]);
      assert.deepEqual(results, expected);
    });
  });

  describe('getMainThreadTopLevelEvents', () => {
    it('gets durations of top-level tasks', () => {
      const trace = {traceEvents: pwaTrace};
      const tabTrace = TraceProcessor.computeTraceOfTab(trace);
      const ret = TraceProcessor.getMainThreadTopLevelEvents(tabTrace);

      assert.equal(ret.length, 645);
    });

    it('filters events based on start and end times', () => {
      const baseTime = 20000 * 1000;
      const name = 'TaskQueueManager::ProcessTaskFromWorkQueue';
      const tabTrace = {
        navigationStartEvt: {ts: baseTime},
        mainThreadEvents: [
          // 15ms to 25ms
          {ts: baseTime + 15 * 1000, dur: 10 * 1000, name},
          // 40ms to 60ms
          {ts: baseTime + 40 * 1000, dur: 20 * 1000, name},
          // 1000ms to 2000ms
          {ts: baseTime + 1000 * 1000, dur: 1000 * 1000, name},
          // 4000ms to 4020ms
          {ts: baseTime + 4000 * 1000, dur: 20 * 1000, name},
        ],
      };

      const ret = TraceProcessor.getMainThreadTopLevelEvents(
        tabTrace,
        50,
        1500
      );
      assert.equal(ret.length, 2);
      assert.equal(ret[0].start, 40);
      assert.equal(ret[0].end, 60);
      assert.equal(ret[0].duration, 20);
      assert.equal(ret[1].start, 1000);
      assert.equal(ret[1].end, 2000);
      assert.equal(ret[1].duration, 1000);
    });
  });

  describe('getMainThreadTopLevelEventDurations', () => {
    it('gets durations of top-level tasks', async () => {
      const trace = {traceEvents: pwaTrace};
      const tabTrace = TraceProcessor.computeTraceOfTab(trace);
      const events = TraceProcessor.getMainThreadTopLevelEvents(tabTrace);
      const ret = TraceProcessor.getMainThreadTopLevelEventDurations(events);
      const durations = ret.durations;

      function getDurationFromIndex(index) {
        return Number(durations[index].toFixed(2));
      }

      assert.equal(durations.filter(dur => isNaN(dur)).length, 0, 'NaN found');
      assert.equal(durations.length, 645);

      const sum = durations.reduce((a, b) => a + b);
      assert.equal(Math.round(sum), 386);

      assert.equal(getDurationFromIndex(50), 0.01);
      assert.equal(getDurationFromIndex(300), 0.04);
      assert.equal(getDurationFromIndex(400), 0.07);
      assert.equal(getDurationFromIndex(durations.length - 3), 26.01);
      assert.equal(getDurationFromIndex(durations.length - 2), 36.9);
      assert.equal(getDurationFromIndex(durations.length - 1), 38.53);
    });
  });

  describe('getRiskToResponsiveness', () => {
    let oldFn;
    // monkeypatch _riskPercentiles to test just getRiskToResponsiveness
    beforeEach(() => {
      oldFn = TraceProcessor._riskPercentiles;
      TraceProcessor._riskPercentiles = (durations, totalTime, percentiles, clippedLength) => {
        return {
          durations, totalTime, percentiles, clippedLength,
        };
      };
    });

    it('compute correct defaults', async () => {
      const trace = {traceEvents: pwaTrace};
      const tabTrace = TraceProcessor.computeTraceOfTab(trace);
      const events = TraceProcessor.getMainThreadTopLevelEvents(tabTrace);
      const ret = TraceProcessor.getRiskToResponsiveness(events, 0, tabTrace.timings.traceEnd);
      assert.equal(ret.durations.length, 645);
      assert.equal(Math.round(ret.totalTime), 2143);
      assert.equal(ret.clippedLength, 0);
      assert.deepEqual(ret.percentiles, [0.5, 0.75, 0.9, 0.99, 1]);
    });

    afterEach(() => {
      TraceProcessor._riskPercentiles = oldFn;
    });
  });

  describe('computeTraceOfTab', () => {
    it('gathers the events from the tab\'s process', () => {
      const trace = TraceProcessor.computeTraceOfTab(lateTracingStartedTrace);

      const firstEvt = trace.processEvents[0];
      trace.processEvents.forEach(evt => {
        assert.equal(evt.pid, firstEvt.pid, 'A traceEvent is found from another process');
      });

      assert.ok(firstEvt.pid === trace.mainFrameIds.pid);
      assert.ok(firstEvt.pid === trace.navigationStartEvt.pid);
      assert.ok(firstEvt.pid === trace.firstContentfulPaintEvt.pid);
      assert.ok(firstEvt.pid === trace.firstMeaningfulPaintEvt.pid);
    });

    it('computes timings of each event', () => {
      const trace = TraceProcessor.computeTraceOfTab(lateTracingStartedTrace);
      assert.equal(Math.round(trace.timings.navigationStart), 0);
      assert.equal(Math.round(trace.timings.firstPaint), 80);
      assert.equal(Math.round(trace.timings.firstContentfulPaint), 80);
      assert.equal(Math.round(trace.timings.firstMeaningfulPaint), 530);
      assert.equal(Math.round(trace.timings.traceEnd), 649);
    });

    it('computes timestamps of each event', () => {
      const trace = TraceProcessor.computeTraceOfTab(lateTracingStartedTrace);
      assert.equal(Math.round(trace.timestamps.navigationStart), 29343540951);
      assert.equal(Math.round(trace.timestamps.firstPaint), 29343620997);
      assert.equal(Math.round(trace.timestamps.firstContentfulPaint), 29343621005);
      assert.equal(Math.round(trace.timestamps.firstMeaningfulPaint), 29344070867);
      assert.equal(Math.round(trace.timestamps.traceEnd), 29344190223);
    });

    describe('finds correct FMP', () => {
      it('if there was a tracingStartedInPage after the frame\'s navStart', () => {
        const trace = TraceProcessor.computeTraceOfTab(lateTracingStartedTrace);
        assert.equal(trace.mainFrameIds.frameId, '0x163736997740');
        assert.equal(trace.navigationStartEvt.ts, 29343540951);
        assert.equal(trace.firstContentfulPaintEvt.ts, 29343621005);
        assert.equal(trace.firstMeaningfulPaintEvt.ts, 29344070867);
        assert.ok(!trace.fmpFellBack);
      });

      it('if there was a tracingStartedInPage after the frame\'s navStart #2', () => {
        const trace = TraceProcessor.computeTraceOfTab(badNavStartTrace);
        assert.equal(trace.mainFrameIds.frameId, '0x89915541e48');
        assert.equal(trace.navigationStartEvt.ts, 8885424467);
        assert.equal(trace.firstContentfulPaintEvt.ts, 8886056886);
        assert.equal(trace.firstMeaningfulPaintEvt.ts, 8886056891);
        assert.ok(!trace.fmpFellBack);
      });

      it('if it appears slightly before the fCP', () => {
        const trace = TraceProcessor.computeTraceOfTab(preactTrace);
        assert.equal(trace.mainFrameIds.frameId, '0x25edaa521e58');
        assert.equal(trace.navigationStartEvt.ts, 1805796384607);
        assert.equal(trace.firstContentfulPaintEvt.ts, 1805797263653);
        assert.equal(trace.firstMeaningfulPaintEvt.ts, 1805797262960);
        assert.ok(!trace.fmpFellBack);
      });

      it('from candidates if no defined FMP exists', () => {
        const trace = TraceProcessor.computeTraceOfTab(noFMPtrace);
        assert.equal(trace.mainFrameIds.frameId, '0x150343381dd0');
        assert.equal(trace.navigationStartEvt.ts, 2146735807738);
        assert.equal(trace.firstContentfulPaintEvt.ts, 2146737302468);
        assert.equal(trace.firstMeaningfulPaintEvt.ts, 2146740268666);
        assert.ok(trace.fmpFellBack);
      });
    });

    describe('finds correct LCP', () => {
      it('in a trace', () => {
        const trace = TraceProcessor.computeTraceOfTab(lcpTrace);
        expect({
          'firstContentfulPaintEvt.ts': trace.firstContentfulPaintEvt.ts,
          'largestContentfulPaintEvt.ts': trace.largestContentfulPaintEvt.ts,
          'mainFrameIds.frameId': trace.mainFrameIds.frameId,
          'navigationStartEvt.ts': trace.navigationStartEvt.ts,
          'timestamps.firstContentfulPaint': trace.timestamps.firstContentfulPaint,
          'timestamps.largestContentfulPaint': trace.timestamps.largestContentfulPaint,
          'timings.firstContentfulPaint': trace.timings.firstContentfulPaint,
          'timings.largestContentfulPaint': trace.timings.largestContentfulPaint,
        }).toMatchInlineSnapshot(`
Object {
  "firstContentfulPaintEvt.ts": 713038144775,
  "largestContentfulPaintEvt.ts": 713038144775,
  "mainFrameIds.frameId": "70B6647836A0A07265E532B094184D2A",
  "navigationStartEvt.ts": 713037023064,
  "timestamps.firstContentfulPaint": 713038144775,
  "timestamps.largestContentfulPaint": 713038144775,
  "timings.firstContentfulPaint": 1121.711,
  "timings.largestContentfulPaint": 1121.711,
}
`);
        assert.ok(!trace.lcpInvalidated);
      });

      it('uses latest candidate', () => {
        const testTrace = createTestTrace({navigationStart: 0, traceEnd: 2000});
        const frame = testTrace.traceEvents[0].args.frame;
        const args = {frame};
        const cat = 'loading,rail,devtools.timeline';
        testTrace.traceEvents.push(
          {name: 'largestContentfulPaint::Candidate', cat, args, ts: 1000, duration: 10},
          {name: 'largestContentfulPaint::Invalidate', cat, args, ts: 1100, duration: 10},
          {name: 'largestContentfulPaint::Candidate', cat, args, ts: 1200, duration: 10}
        );
        const trace = TraceProcessor.computeTraceOfTab(testTrace);
        assert.equal(trace.timestamps.largestContentfulPaint, 1200);
        assert.ok(!trace.lcpInvalidated);
      });

      it('undefined if no candidates', () => {
        const testTrace = createTestTrace({navigationStart: 0, traceEnd: 2000});
        const trace = TraceProcessor.computeTraceOfTab(testTrace);
        assert.equal(trace.timestamps.largestContentfulPaint, undefined);
        assert.ok(!trace.lcpInvalidated);
      });

      it('invalidates if last event is ::Invalidate', () => {
        const testTrace = createTestTrace({navigationStart: 0, traceEnd: 2000});
        const frame = testTrace.traceEvents[0].args.frame;
        const args = {frame};
        const cat = 'loading,rail,devtools.timeline';
        testTrace.traceEvents.push(
          {name: 'largestContentfulPaint::Candidate', cat, args, ts: 1000, duration: 10},
          {name: 'largestContentfulPaint::Invalidate', cat, args, ts: 1100, duration: 10}
        );
        const trace = TraceProcessor.computeTraceOfTab(testTrace);
        assert.equal(trace.largestContentfulPaintEvt, undefined);
        assert.ok(trace.lcpInvalidated);
      });

      it('ignores candidates before navstart', () => {
        const testTrace = createTestTrace({navigationStart: 1100, traceEnd: 2000});
        const frame = testTrace.traceEvents[0].args.frame;
        const args = {frame};
        const cat = 'loading,rail,devtools.timeline';
        testTrace.traceEvents.push(
          {name: 'largestContentfulPaint::Candidate', cat, args, ts: 1000, duration: 10}
        );
        const trace = TraceProcessor.computeTraceOfTab(testTrace);
        assert.equal(trace.largestContentfulPaintEvt, undefined);
        assert.ok(!trace.lcpInvalidated);
      });
    });

    it('handles traces missing a paints (captured in background tab)', () => {
      const trace = TraceProcessor.computeTraceOfTab(backgroundTabTrace);
      assert.equal(trace.mainFrameIds.frameId, '0x53965941e30');
      assert.notEqual(trace.navigationStartEvt.ts, 1966813346529, 'picked wrong frame');
      assert.notEqual(trace.navigationStartEvt.ts, 1966813520313, 'picked wrong frame');
      assert.equal(
        trace.navigationStartEvt.ts,
        1966813258737,
        'didnt select navStart event with same timestamp as usertiming measure'
      );
      assert.equal(trace.firstMeaningfulPaintEvt, undefined, 'bad fmp');
    });

    it('handles traces with TracingStartedInBrowser events', () => {
      const tracingStartedInBrowserTrace = {
        'traceEvents': [{
          'pid': 69850,
          'tid': 69850,
          'ts': 2193564729582,
          'ph': 'I',
          'cat': 'disabled-by-default-devtools.timeline',
          'name': 'TracingStartedInBrowser',
          'args': {'data': {
            'frameTreeNodeId': 1,
            'frames': [{
              'frame': 'B192D1F3355A6F961EC8F0B01623C1FB',
              'url': 'http://www.example.com/',
              'name': '',
              'processId': 69920,
            }],
          }},
          'tts': 1085165,
          's': 't',
        }, {
          'pid': 69920,
          'tid': 1,
          'ts': 2193564790059,
          'ph': 'R',
          'cat': 'blink.user_timing',
          'name': 'navigationStart',
          'args': {
            'frame': 'B192D1F3355A6F961EC8F0B01623C1FB',
            'data': {
              'documentLoaderURL': 'http://www.example.com/',
              'isLoadingMainFrame': true,
            },
          },
          'tts': 141371,
        }, {
          'pid': 69920,
          'tid': 1,
          'ts': 2193564790060,
          'ph': 'R',
          'cat': 'loading,rail,devtools.timeline',
          'name': 'firstContentfulPaint',
          'args': {
            'frame': 'B192D1F3355A6F961EC8F0B01623C1FB',
          },
          'tts': 141372,
        }, {
          'pid': 69920,
          'tid': 1,
          'ts': 0,
          'ph': 'M',
          'cat': '__metadata',
          'name': 'thread_name',
          'args': {'name': 'CrRendererMain'},
        }]};
      const trace = TraceProcessor.computeTraceOfTab(tracingStartedInBrowserTrace);
      assert.equal(trace.mainFrameIds.frameId, 'B192D1F3355A6F961EC8F0B01623C1FB');
      assert.equal(trace.navigationStartEvt.ts, 2193564790059);
    });

    it('handles no TracingStarted errors in m74+', () => {
      const trace = TraceProcessor.computeTraceOfTab(noTracingStartedTrace);
      expect(trace.mainFrameIds.frameId).toEqual('0E0B1AF0B1BA04676037345D18A71577');
      expect(trace.firstContentfulPaintEvt.ts).toEqual(2610265036367);
    });

    it('sorts events by increasing timestamp', () => {
      const trace = JSON.parse(fs.readFileSync(__dirname +
          '/../../fixtures/traces/tracingstarted-after-navstart.json', 'utf8'));
      const shuffledEvents = trace.traceEvents.slice().sort(() => Math.random() * 2 - 1);
      const traceOfTab = TraceProcessor.computeTraceOfTab({traceEvents: shuffledEvents});

      let lastTs = -Infinity;
      for (const event of traceOfTab.processEvents) {
        if (!event.ts) continue;
        expect(event.ts).toBeGreaterThanOrEqual(lastTs);
        lastTs = event.ts;
      }
    });

    describe('#filteredTraceSort', () => {
      it('sorts by ts', () => {
        const events = [
          {pid: 3, ts: 10},
          {pid: 1, ts: 5},
          {pid: 4, ts: 11},
          {pid: 2, ts: 7},
        ];

        expect(TraceProcessor.filteredTraceSort(events, () => true)).toEqual([
          {pid: 1, ts: 5},
          {pid: 2, ts: 7},
          {pid: 3, ts: 10},
          {pid: 4, ts: 11},
        ]);
      });

      it('sorts within timestamp groups', () => {
        const events = [
          {pid: 3, ts: 10, dur: 0, ph: 'X'},
          {pid: 2, ts: 5, dur: 0, ph: 'X'},
          {pid: 4, ts: 11, dur: 5, ph: 'X'},
          {pid: 1, ts: 5, dur: 10, ph: 'X'},
          {pid: 5, ts: 11, dur: 3, ph: 'X'},
        ];

        expect(TraceProcessor.filteredTraceSort(events, () => true)).toEqual([
          {pid: 1, ts: 5, dur: 10, ph: 'X'},
          {pid: 2, ts: 5, dur: 0, ph: 'X'},
          {pid: 3, ts: 10, dur: 0, ph: 'X'},
          {pid: 4, ts: 11, dur: 5, ph: 'X'},
          {pid: 5, ts: 11, dur: 3, ph: 'X'},
        ]);
      });

      it('filters', () => {
        const events = [
          {pid: 3, ts: 10, dur: 0},
          {pid: 2, ts: 5, dur: 0},
          {pid: 4, ts: 11, dur: 5},
          {pid: 1, ts: 5, dur: 10},
          {pid: 5, ts: 11, dur: 3},
        ];

        // Just keep odd pids
        expect(TraceProcessor.filteredTraceSort(events, evt => evt.pid % 2 === 1)).toEqual([
          {pid: 1, ts: 5, dur: 10},
          {pid: 3, ts: 10, dur: 0},
          {pid: 5, ts: 11, dur: 3},
        ]);
      });

      it('sorts timestamp groups with E events first', () => {
        const events = [
          {pid: 2, ts: 1, ph: 'B', name: 'UpdateLayer'},
          {pid: 4, ts: 1, ph: 'B', name: 'CompositeLayers'},
          {pid: 3, ts: 1, dur: 5, ph: 'X'},
          {pid: 1, ts: 1, dur: 10, ph: 'X'},
          {pid: 5, ts: 1, dur: 3, ph: 'X'},
          {pid: 0, ts: 1, ph: 'E'},
          {pid: 2, ts: 8, ph: 'E', name: 'UpdateLayer'},
          {pid: 4, ts: 5, ph: 'E', name: 'CompositeLayers'},
        ];

        expect(TraceProcessor.filteredTraceSort(events, () => true)).toEqual([
          {pid: 0, ts: 1, ph: 'E'},
          {pid: 1, ts: 1, dur: 10, ph: 'X'},
          {pid: 2, ts: 1, ph: 'B', name: 'UpdateLayer'},
          {pid: 3, ts: 1, dur: 5, ph: 'X'},
          {pid: 4, ts: 1, ph: 'B', name: 'CompositeLayers'},
          {pid: 5, ts: 1, dur: 3, ph: 'X'},
          {pid: 4, ts: 5, ph: 'E', name: 'CompositeLayers'},
          {pid: 2, ts: 8, ph: 'E', name: 'UpdateLayer'},
        ]);
      });

      it('sorts timestamp groups with unmatched B events', () => {
        const events = [
          {pid: 3, ts: 1, ph: 'B', name: 'CompositeLayers'},
          {pid: 2, ts: 1, dur: 5, ph: 'X'},
          {pid: 1, ts: 1, ph: 'B', name: 'UpdateLayer'},
          {pid: 3, ts: 5, ph: 'E', name: 'CompositeLayers'},
        ];

        expect(TraceProcessor.filteredTraceSort(events, () => true)).toEqual([
          {pid: 1, ts: 1, ph: 'B', name: 'UpdateLayer'},
          {pid: 2, ts: 1, dur: 5, ph: 'X'},
          {pid: 3, ts: 1, ph: 'B', name: 'CompositeLayers'},
          {pid: 3, ts: 5, ph: 'E', name: 'CompositeLayers'},
        ]);
      });

      it('sorts timestamp groups with stable sort when all else fails', () => {
        const events = [
          {pid: 3, ts: 1, ph: 'D', name: 'CompositeLayers'},
          {pid: 2, ts: 1, dur: 5, ph: 'M'},
          {pid: 1, ts: 1, ph: 'M', name: 'UpdateLayer'},
          {pid: 3, ts: 5, ph: 'M', name: 'CompositeLayers'},
        ];

        expect(TraceProcessor.filteredTraceSort(events, () => true)).toEqual(events);
      });
    });


    it('throws on traces missing a navigationStart', () => {
      expect(() => TraceProcessor.computeTraceOfTab(noNavStartTrace))
        .toThrowError('navigationStart');
    });

    it('does not throw on traces missing an FCP', () => {
      expect(() => TraceProcessor.computeTraceOfTab(noFCPtrace)).not.toThrow();
    });
  });
});
