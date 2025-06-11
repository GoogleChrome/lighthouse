/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {CpuProfileModel} from '../../../lib/tracehouse/cpu-profile-model.js';
import {TraceProcessor} from '../../../lib/tracehouse/trace-processor.js';
import {MainThreadTasks} from '../../../lib/tracehouse/main-thread-tasks.js';
import {readJson} from '../../test-utils.js';

const profilerTrace = readJson('../../fixtures/traces/cpu-profiler-m86.trace.json', import.meta);

describe('CPU Profile Model', () => {
  /** @type {LH.TraceCpuProfile} */
  let profile;

  beforeEach(() => {
    /*
    An artistic rendering of the below profile:
    ████████████████(root)████████████████
    ███████████████(program)██████████████
    ███████████████Foo██████████████
      ██████Bar███████     █Baz█
        █Baz█
    */
    profile = {
      id: '0x1',
      pid: 1,
      tid: 1,
      startTime: 9e6,
      nodes: [
        {id: 0, callFrame: {functionName: '(root)'}},
        {id: 1, callFrame: {functionName: '(program)'}, parent: 0},
        {id: 2, callFrame: {functionName: 'Foo', url: 'fileA.js'}, parent: 1},
        {id: 3, callFrame: {functionName: 'Bar', url: 'fileA.js'}, parent: 2},
        {id: 4, callFrame: {functionName: 'Baz', url: 'fileA.js'}, parent: 3},
        {id: 5, callFrame: {functionName: 'Baz', url: 'fileB.js'}, parent: 2},
      ],
      samples: [2, 2, 3, 4, 3, 3, 2, 5, 1, 1],
      timeDeltas: [10e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3],
    };
  });

  describe('#_findEffectiveTimestamp', () => {
    const findTimestamp = CpuProfileModel._findEffectiveTimestamp.bind(CpuProfileModel);
    let defaultData;

    function createTask(startProfilerRange, endProfilerRange) {
      return {
        event: {args: {data: {_syntheticProfilerRange: startProfilerRange}}},
        endEvent: {args: {data: {_syntheticProfilerRange: endProfilerRange}}},
      };
    }

    beforeEach(() => {
      defaultData = {
        syntheticTask: createTask(
          {earliestPossibleTimestamp: 100, latestPossibleTimestamp: 1000},
          {earliestPossibleTimestamp: 1000, latestPossibleTimestamp: 2000}
        ),
        allEventsAtTs: {naive: [], refined: []},
        knownTasksByStartTime: [],
        knownTaskStartTimeIndex: 0,
        knownTasksByEndTime: [],
        knownTaskEndTimeIndex: 0,
      };
    });

    it('should default to the longest possible timestamps when no task data available', () => {
      const startResult = findTimestamp({...defaultData, eventType: 'start'});
      const endResult = findTimestamp({...defaultData, eventType: 'end'});
      expect(startResult).toEqual({timestamp: 100, lastStartTimeIndex: 0, lastEndTimeIndex: 0});
      expect(endResult).toEqual({timestamp: 2000, lastStartTimeIndex: 0, lastEndTimeIndex: 0});
    });

    it('should use the longest possible timestamps when tasks fully include range', () => {
      // Cases tested:
      //  - eventType=start,task=parent
      //  - eventType=end,task=parent
      const tasks = [{startTime: 0, endTime: 2500}];
      const data = {...defaultData, knownTasksByStartTime: tasks, knownTasksByEndTime: tasks};
      const startResult = findTimestamp({...data, eventType: 'start'});
      const endResult = findTimestamp({...data, eventType: 'end', knownTaskStartTimeIndex: 1});

      expect(startResult).toEqual({timestamp: 100, lastStartTimeIndex: 1, lastEndTimeIndex: 0});
      expect(endResult).toEqual({timestamp: 2000, lastStartTimeIndex: 1, lastEndTimeIndex: 0});
    });

    it('should use the longest possible timestamps when tasks are fully contained in range', () => {
      // Cases tested:
      //  - eventType=start,task=child
      //  - eventType=end,task=child
      const tasks = [{startTime: 250, endTime: 750}, {startTime: 1250, endTime: 1750}];
      const data = {...defaultData, knownTasksByStartTime: tasks, knownTasksByEndTime: tasks};
      const startResult = findTimestamp({...data, eventType: 'start'});
      const endResult = findTimestamp({
        ...data,
        eventType: 'end',
        knownTaskStartTimeIndex: 1,
        knownTaskEndTimeIndex: 1,
      });

      expect(startResult).toEqual({timestamp: 100, lastStartTimeIndex: 1, lastEndTimeIndex: 1});
      expect(endResult).toEqual({timestamp: 2000, lastStartTimeIndex: 2, lastEndTimeIndex: 2});
    });

    it('should use the earliest possible timestamp when tasks started in range', () => {
      // Cases tested:
      //  - eventType=start,task=parent,minTs
      //  - eventType=end,task=unrelated,maxTs
      const tasks = [{startTime: 250, endTime: 3000}, {startTime: 1500, endTime: 3000}];
      const data = {...defaultData, knownTasksByStartTime: tasks, knownTasksByEndTime: tasks};
      const startResult = findTimestamp({...data, eventType: 'start'});
      const endResult = findTimestamp({
        ...data,
        eventType: 'end',
        knownTaskStartTimeIndex: 1,
      });

      expect(startResult).toEqual({timestamp: 250, lastStartTimeIndex: 1, lastEndTimeIndex: 0});
      expect(endResult).toEqual({timestamp: 1500, lastStartTimeIndex: 2, lastEndTimeIndex: 0});
    });

    it('should use the latest possible timestamp when tasks ended in range', () => {
      // Cases tested:
      //  - eventType=start,task=unrelated,minTs
      //  - eventType=end,task=parent,maxTs
      const tasks = [{startTime: 0, endTime: 500}, {startTime: 0, endTime: 1500}];
      const data = {...defaultData, knownTasksByStartTime: tasks, knownTasksByEndTime: tasks};
      const startResult = findTimestamp({...data, eventType: 'start'});
      const endResult = findTimestamp({
        ...data,
        eventType: 'end',
        knownTaskStartTimeIndex: 1,
      });

      expect(startResult).toEqual({timestamp: 500, lastStartTimeIndex: 2, lastEndTimeIndex: 1});
      expect(endResult).toEqual({timestamp: 1500, lastStartTimeIndex: 2, lastEndTimeIndex: 2});
    });

    it('should consider the other refined timestamps at the same range', () => {
      // Cases tested:
      //  - eventType=start,allEventsAtTs=[late E],minTs
      //  - eventType=end,allEventsAtTs=[early B],maxTs
      const startResult = findTimestamp({
        ...defaultData,
        eventType: 'start',
        allEventsAtTs: {refined: [{ph: 'E', ts: 1000}]},
      });
      const endResult = findTimestamp({
        ...defaultData,
        eventType: 'end',
        allEventsAtTs: {refined: [{ph: 'B', ts: 1100}]},
      });

      expect(startResult).toEqual({timestamp: 1000, lastStartTimeIndex: 0, lastEndTimeIndex: 0});
      expect(endResult).toEqual({timestamp: 1100, lastStartTimeIndex: 0, lastEndTimeIndex: 0});
    });

    it('should handle multiple tasks', () => {
      const tasks = [
        {startTime: 250, endTime: 1500},
        {startTime: 500, endTime: 1400},
        {startTime: 1100, endTime: 1200},
        {startTime: 1700, endTime: 1800},
        {startTime: 1900, endTime: 2200},
        {startTime: 1925, endTime: 1975},
      ];

      const data = {
        ...defaultData,
        knownTasksByStartTime: tasks,
        knownTasksByEndTime: tasks.slice().sort((a, b) => a.endTime - b.endTime),
      };
      const startResult = findTimestamp({
        ...data,
        eventType: 'start',
        syntheticTask: createTask(
          {earliestPossibleTimestamp: 1000, latestPossibleTimestamp: 2000},
          {earliestPossibleTimestamp: 2000, latestPossibleTimestamp: 3000}
        ),
      });
      const endResult = findTimestamp({
        ...data,
        eventType: 'end',
        syntheticTask: createTask(
          {earliestPossibleTimestamp: 100, latestPossibleTimestamp: 1000},
          {earliestPossibleTimestamp: 1000, latestPossibleTimestamp: 2000}
        ),
      });

      expect(startResult).toEqual({timestamp: 1900, lastStartTimeIndex: 6, lastEndTimeIndex: 5});
      expect(endResult).toEqual({timestamp: 1400, lastStartTimeIndex: 6, lastEndTimeIndex: 5});
    });
  });

  describe('#synthesizeTraceEvents', () => {
    it('should create events in order', () => {
      const ts = x => profile.startTime + x;
      const events = CpuProfileModel.synthesizeTraceEvents(profile);

      expect(events).toMatchObject([
        {ph: 'B', ts: ts(10e3), args: {data: {callFrame: {functionName: '(root)'}}}},
        {ph: 'B', ts: ts(10e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'B', ts: ts(10e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'B', ts: ts(12e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(13e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(14e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(16e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(17e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(18e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(18e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'E', ts: ts(19e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'E', ts: ts(19e3), args: {data: {callFrame: {functionName: '(root)'}}}},
      ]);
    });

    it('should create events while aware of other tasks', () => {
      const ts = x => profile.startTime + x;

      // With the sampling profiler we know that Baz and Foo ended *sometime between* 17e3 and 18e3.
      // We want to make sure when additional task information is present, we refine the end time.
      const tasks = [
        // The RunTask at the toplevel, but should move start/end time of root/program to 8.0e3/19.5e3.
        {startTime: 8.0, endTime: 19.5, event: {ts: ts(8e3)}},
        // The EvaluateScript at the 2nd level, should move start/end time of Foo + 2nd Baz to 9.0e3/17.4e3.
        {startTime: 9.0, endTime: 17.4},
        // A small task inside Baz, should move the start time of Baz to 12.5e3.
        {startTime: 12.5, endTime: 13.4},
        // A small task inside Foo, should move the end time of Bar to 15.7e3, start time of Baz to 16.8e3.
        {startTime: 15.7, endTime: 16.8},
      ];

      const events = CpuProfileModel.synthesizeTraceEvents(profile, tasks);

      expect(events).toMatchObject([
        {ph: 'B', ts: ts(8.0e3), args: {data: {callFrame: {functionName: '(root)'}}}},
        {ph: 'B', ts: ts(8.0e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'B', ts: ts(9.0e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'B', ts: ts(11.0e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(12.5e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(13.4e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(15.7e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(16.8e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(17.4e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(17.4e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'E', ts: ts(19.5e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'E', ts: ts(19.5e3), args: {data: {callFrame: {functionName: '(root)'}}}},
      ]);
    });

    it('should handle multiple task start/stop times with low sampling rate', () => {
      /*
        An artistic rendering of the below profile with tasks:
        ████████████████(root)████████████████
        ███████Task███████  ██████Task██████ █
         ██████Eval██████   ██████Eval██████
         ██████Foo███████   ██████Bar██████
          █Fn█
          █Fn█
      */
      profile = {
        id: '0x1',
        pid: 1,
        tid: 1,
        startTime: 9e6,
        nodes: [
          {id: 0, callFrame: {functionName: '(root)'}},
          {id: 1, callFrame: {functionName: 'Foo', url: 'fileA.js'}, parent: 0},
          {id: 2, callFrame: {functionName: 'Bar', url: 'fileA.js'}, parent: 0},
        ],
        samples: [0, 1, 1, 2, 2, 0],
        timeDeltas: [0.5e3, 19.5e3, 20e3, 20e3, 20e3, 20e3],
      };

      const ts = x => profile.startTime + x;

      // With the sampling profiler we know that Foo switched to Bar, but we don't know when.
      // Create a set of tasks that force large changes.
      const tasks = [
        // The RunTask at the toplevel, parent of Foo execution
        {startTime: 1, endTime: 50, event: {ts: ts(1e3)}},
        // The EvaluateScript at the next level, parent of Foo execution
        {startTime: 5, endTime: 45},
        // The FunctionCall at the next level, should be a child of Foo execution
        {startTime: 10, endTime: 25},
        // The FunctionCall at the next level, should be a child of Foo execution
        {startTime: 12, endTime: 22},
        // The RunTask at the toplevel, parent of Bar execution
        {startTime: 51, endTime: 90},
        // The EvaluateScript at the next level, parent of Bar execution
        {startTime: 55, endTime: 85},
        // The RunTask at the toplevel, there to mess with Bar timing
        {startTime: 92, endTime: 103},
      ];

      const events = CpuProfileModel.synthesizeTraceEvents(profile, tasks);

      expect(events).toMatchObject([
        {ph: 'B', ts: ts(0.5e3), args: {data: {callFrame: {functionName: '(root)'}}}},
        {ph: 'B', ts: ts(5e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'E', ts: ts(45e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'B', ts: ts(55e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'E', ts: ts(85e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'E', ts: ts(103e3), args: {data: {callFrame: {functionName: '(root)'}}}},
      ]);
    });

    it('should handle multiple roots', () => {
      /*
        An artistic rendering of the below profile with tasks:
        ███(rootA)███ ███(rootB)███ ███(rootC)███
        ███Task███     ███Task███    ███Task███
      */
      profile = {
        id: '0x1',
        pid: 1,
        tid: 1,
        startTime: 9e6,
        nodes: [
          {id: 0, callFrame: {functionName: '(rootA)'}},
          {id: 1, callFrame: {functionName: 'Task'}, parent: 0},
          {id: 2, callFrame: {functionName: '(rootB)'}},
          {id: 3, callFrame: {functionName: 'Task'}, parent: 2},
          {id: 4, callFrame: {functionName: '(rootC)'}},
          {id: 5, callFrame: {functionName: 'Task'}, parent: 4},
        ],
        samples: [0, 1, 3, 3, 5, 4],
        timeDeltas: [0.5e3, 19.5e3, 20e3, 20e3, 20e3, 20e3],
      };

      const ts = x => profile.startTime + x;

      const events = CpuProfileModel.synthesizeTraceEvents(profile, []);

      expect(events).toMatchObject([
        {ph: 'B', ts: ts(0.5e3), args: {data: {callFrame: {functionName: '(rootA)'}}}},
        {ph: 'B', ts: ts(20e3), args: {data: {callFrame: {functionName: 'Task'}}}},
        {ph: 'E', ts: ts(40e3), args: {data: {callFrame: {functionName: 'Task'}}}},
        {ph: 'E', ts: ts(40e3), args: {data: {callFrame: {functionName: '(rootA)'}}}},
        {ph: 'B', ts: ts(40e3), args: {data: {callFrame: {functionName: '(rootB)'}}}},
        {ph: 'B', ts: ts(40e3), args: {data: {callFrame: {functionName: 'Task'}}}},
        {ph: 'E', ts: ts(80e3), args: {data: {callFrame: {functionName: 'Task'}}}},
        {ph: 'E', ts: ts(80e3), args: {data: {callFrame: {functionName: '(rootB)'}}}},
        {ph: 'B', ts: ts(80e3), args: {data: {callFrame: {functionName: '(rootC)'}}}},
        {ph: 'B', ts: ts(80e3), args: {data: {callFrame: {functionName: 'Task'}}}},
        {ph: 'E', ts: ts(100e3), args: {data: {callFrame: {functionName: 'Task'}}}},
        {ph: 'E', ts: ts(100e3), args: {data: {callFrame: {functionName: '(rootC)'}}}},
      ]);
    });

    it('should create main-thread-task parseable events', () => {
      const ts = x => profile.startTime + x;
      const events = CpuProfileModel.synthesizeTraceEvents(profile);

      const tasks = MainThreadTasks.getMainThreadTasks(events, [], ts(19e3));
      expect(tasks).toHaveLength(6);
      expect(tasks[0]).toMatchObject({
        event: {args: {data: {callFrame: {functionName: '(root)'}}}},
        children: [
          {
            event: {args: {data: {callFrame: {functionName: '(program)'}}}},
            children: [{event: {args: {data: {callFrame: {functionName: 'Foo'}}}}}],
          },
        ],
      });

      const fooTask = tasks[0].children[0].children[0];
      expect(fooTask).toMatchObject({
        startTime: 0,
        endTime: 8,
        event: {args: {data: {callFrame: {functionName: 'Foo'}}}},
        children: [
          {
            startTime: 2,
            endTime: 6,
            event: {args: {data: {callFrame: {functionName: 'Bar'}}}},
            children: [{event: {args: {data: {callFrame: {functionName: 'Baz'}}}}}],
          },
          {
            startTime: 7,
            endTime: 8,
            event: {args: {data: {callFrame: {functionName: 'Baz'}}}},
            children: [],
          },
        ],
      });

      const visualization = MainThreadTasks.printTaskTreeToDebugString(tasks, {
        printWidth: 80,
      }).replace(/ +\n/g, '\n');
      expect(visualization).toMatchInlineSnapshot(`
        "Trace Duration: 9ms
        Range: [0, 9]
        █ = 0.11ms

        ████████████████████████████████████████A████████████████████████████████████████
        ████████████████████████████████████████B████████████████████████████████████████
        ███████████████████████████████████C████████████████████████████████████
                         ██████████████████D██████████████████        ████F█████
                                  ████E█████

        A = FunctionCall-SynthesizedByProfilerModel
        B = FunctionCall-SynthesizedByProfilerModel
        C = FunctionCall-SynthesizedByProfilerModel
        D = FunctionCall-SynthesizedByProfilerModel
        E = FunctionCall-SynthesizedByProfilerModel
        F = FunctionCall-SynthesizedByProfilerModel"
      `);
    });

    it('should work on a real trace', () => {
      const {processEvents} = TraceProcessor.processTrace(profilerTrace);
      const profiles = CpuProfileModel.collectProfileEvents(processEvents);
      const events = CpuProfileModel.synthesizeTraceEvents(profiles[0]);
      expect(events).toHaveLength(230);
      const lastTs = events[events.length - 1].length;
      const tasks = MainThreadTasks.getMainThreadTasks(events, [], lastTs);
      expect(tasks).toHaveLength(115);
    });
  });

  describe('#collectProfileEvents', () => {
    const nodes = [{id: 0}, {id: 1}];
    const samples = [0, 1, 0, 1];
    const timeDeltas = [10, 5, 5, 5];
    /** @param {Record<string, any>} data */
    const args = data => ({args: {data}});

    it('should extract profiles', () => {
      const cpuProfile = {nodes, samples, timeDeltas};
      const traceEvents = [
        {id: 'A', name: 'Profile', pid: 1, tid: 2, ...args({startTime: 1234, cpuProfile})},
        {id: 'B', name: 'Profile', pid: 1, tid: 3, ...args({startTime: 2345, cpuProfile})},
      ];

      const profiles = CpuProfileModel.collectProfileEvents(traceEvents);
      expect(profiles).toEqual([
        {id: 'A', pid: 1, tid: 2, startTime: 1234, nodes, samples, timeDeltas},
        {id: 'B', pid: 1, tid: 3, startTime: 2345, nodes, samples, timeDeltas},
      ]);
    });

    it('should ignore profiles without an ID', () => {
      const cpuProfile = {nodes, samples, timeDeltas};
      const traceEvents = [
        {name: 'Profile', pid: 1, tid: 2, ...args({startTime: 1234, cpuProfile})},
        {id: 'missing', name: 'ProfileChunk', pid: 1, tid: 3, ...args({cpuProfile})},
      ];

      const profiles = CpuProfileModel.collectProfileEvents(traceEvents);
      expect(profiles).toEqual([]);
    });

    it('should handle definition of a profile across multiple events', () => {
      const traceEvents = [
        {id: 'A', name: 'Profile', pid: 1, tid: 2, ...args({startTime: 1234})},
        {id: 'B', name: 'Profile', ts: 1235, pid: 1, tid: 3, ...args({cpuProfile: {nodes}})},
        {id: 'A', name: 'ProfileChunk', ts: 2345, pid: 1, tid: 2, ...args({cpuProfile: {nodes}})},
        {id: 'A', name: 'ProfileChunk', ts: 3456, pid: 1, tid: 2, ...args({cpuProfile: {samples}})},
        {id: 'A', name: 'ProfileChunk', ts: 4567, pid: 1, tid: 2, ...args({timeDeltas})},
      ];

      const profiles = CpuProfileModel.collectProfileEvents(traceEvents);
      expect(profiles).toEqual([
        {id: 'A', pid: 1, tid: 2, startTime: 1234, nodes, samples, timeDeltas},
        {id: 'B', pid: 1, tid: 3, startTime: 1235, nodes, samples: [], timeDeltas: []},
      ]);
    });

    it('should work on a real trace', () => {
      const {processEvents} = TraceProcessor.processTrace(profilerTrace);
      const profiles = CpuProfileModel.collectProfileEvents(processEvents);
      expect(profiles).toMatchObject([
        {
          id: '0x2',
          pid: 9318,
          tid: 775,
          startTime: 459852380794,
        },
      ]);

      expect(profiles[0]).toHaveProperty('nodes');
      expect(profiles[0].samples).toHaveLength(profiles[0].timeDeltas.length);
    });
  });
});
