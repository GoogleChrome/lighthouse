/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {MainThreadTasks} from '../../../lib/tracehouse/main-thread-tasks.js';
import {TraceProcessor} from '../../../lib/tracehouse/trace-processor.js';
import {taskGroups} from '../../../lib/tracehouse/task-groups.js';
import {readJson} from '../../test-utils.js';

const pwaTrace = readJson('../../fixtures/traces/progressive-app.json', import.meta);
const noTracingStartedTrace = readJson('../../fixtures/traces/no-tracingstarted-m74.json', import.meta);

describe('Main Thread Tasks', () => {
  const pid = 1;
  const tid = 2;
  const frameId = 'BLAH';
  const args = {data: {}, frame: frameId};
  const baseTs = 1241250325;
  let boilerplateTrace;

  beforeEach(() => {
    boilerplateTrace = [
      {ph: 'I', name: 'TracingStartedInPage', pid, tid, ts: baseTs, args: {data: {page: frameId}}},
      {ph: 'I', name: 'navigationStart', pid, tid, ts: baseTs, args},
      {ph: 'M', name: 'thread_name', pid, tid, ts: baseTs, cat: '__metadata', args:
        {name: 'CrRendererMain'}},
      {ph: 'R', name: 'firstContentfulPaint', pid, tid, ts: baseTs + 1, args},
    ];
  });

  function run(trace) {
    const {mainThreadEvents, frames, timestamps} = TraceProcessor.processTrace(trace);
    return MainThreadTasks.getMainThreadTasks(mainThreadEvents, frames, timestamps.traceEnd);
  }

  /** @param {string} s */
  function trimTrailingWhitespace(s) {
    return s.split('\n').map(line => line.trimEnd()).join('\n');
  }

  it('should get all main thread tasks from a trace', () => {
    const tasks = run({traceEvents: pwaTrace});
    const toplevelTasks = tasks.filter(task => !task.parent);
    assert.equal(tasks.length, 2305);
    assert.equal(toplevelTasks.length, 296);

    // Check the reachability of tasks and summation of selfTime.
    const allTasks = [];
    const queue = toplevelTasks;
    let totalTime = 0;
    let totalTopLevelTime = 0;
    while (queue.length) {
      const task = queue.shift();
      totalTime += task.selfTime;
      totalTopLevelTime += TraceProcessor.isScheduleableTask(task.event) ? task.duration : 0;
      allTasks.push(task);
      queue.push(...task.children);
    }

    assert.equal(allTasks.length, 2305);
    assert.equal(Math.round(totalTopLevelTime), 386);
    assert.equal(Math.round(totalTime), 396);
  });

  it('should handle slightly trace events that slightly overlap', () => {
    const tasks = run(noTracingStartedTrace);
    expect(tasks).toHaveLength(425);
  });

  it('should use the first task as time origin if no traceStartTs is given', () => {
    const {mainThreadEvents, frames, timestamps} =
        TraceProcessor.processTrace({traceEvents: pwaTrace});
    const tasks = MainThreadTasks.getMainThreadTasks(mainThreadEvents, frames, timestamps.traceEnd);

    expect(tasks[0]).toMatchObject({
      startTime: 0,
      endTime: expect.toBeApproximately(0.02),
    });
    expect(tasks[1]).toMatchObject({
      startTime: expect.toBeApproximately(0.02),
      endTime: expect.toBeApproximately(0.03),
    });
  });

  it('should use traceStartTs as time origin if given', () => {
    const {mainThreadEvents, frames, timestamps} =
        TraceProcessor.processTrace({traceEvents: pwaTrace});
    const tasks = MainThreadTasks.getMainThreadTasks(mainThreadEvents, frames, timestamps.traceEnd,
        timestamps.timeOrigin);

    expect(tasks[0]).toMatchObject({
      startTime: expect.toBeApproximately(-15.02),
      endTime: expect.toBeApproximately(-15),
    });
    expect(tasks[1]).toMatchObject({
      startTime: expect.toBeApproximately(-15),
      endTime: expect.toBeApproximately(-14.99),
    });
  });

  it('should compute parent/child correctly', () => {
    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA██████████████████████████████████████████████
          ████████████████TaskB███████████████████
               ████TaskC██████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, args},
      {ph: 'X', name: 'TaskC', pid, tid, ts: baseTs + 10e3, dur: 30e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 55e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    expect(tasks).toHaveLength(3);

    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'TaskC');
    expect(taskA).toEqual({
      parent: undefined,
      attributableURLs: [],

      children: [taskB],
      event: traceEvents[4],
      startTime: 0,
      endTime: 100,
      duration: 100,
      selfTime: 50,
      group: taskGroups.other,
      unbounded: false,
    });

    expect(taskB).toEqual({
      parent: taskA,
      attributableURLs: [],

      children: [taskC],
      event: traceEvents[5],
      endEvent: traceEvents[7],
      startTime: 5,
      endTime: 55,
      duration: 50,
      selfTime: 20,
      group: taskGroups.other,
      unbounded: false,
    });
  });

  it('should compute basic attributableURLs correctly', () => {
    const baseTs = 1241250325;
    const url = s => ({args: {data: {url: s}}});
    const stackTrace = f => ({args: {data: {stackTrace: f.map(url => ({url}))}}});

    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA██████████████████████████████████████████████
          ████████████████TaskB███████████████████
               ████EvaluateScript██████
                   █D█
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, ...url('urlIgnoredOnRunTask')},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, ...stackTrace(['urlB.1', 'urlB.2'])},
      {ph: 'X', name: 'EvaluateScript', pid, tid, ts: baseTs + 10e3, dur: 30e3, ...url('urlC')},
      {ph: 'X', name: 'TaskD', pid, tid, ts: baseTs + 15e3, dur: 5e3, ...stackTrace(['urlD'])},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 55e3},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'EvaluateScript');
    const taskD = tasks.find(task => task.event.name === 'TaskD');

    assert.deepStrictEqual(taskA.attributableURLs, ['urlB.1', 'urlB.2', 'urlC', 'urlD']);
    assert.deepStrictEqual(taskB.attributableURLs, ['urlB.1', 'urlB.2']);
    assert.deepStrictEqual(taskC.attributableURLs, ['urlB.1', 'urlB.2', 'urlC']);
    assert.deepStrictEqual(taskD.attributableURLs, ['urlB.1', 'urlB.2', 'urlC', 'urlD']);
  });

  it('should compute attributableURLs correctly across timers', () => {
    const baseTs = 1241250325;
    const url = s => ({args: {data: {url: s}}});
    const stackTrace = f => ({args: {data: {stackTrace: f.map(url => ({url}))}}});
    const timerId = id => ({args: {data: {timerId: id}}});

    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA██████████████████████████████████████████████
          ████████████████TaskB███████████████████                  █Timer Fire█
               ████EvaluateScript██████                               █TaskE█
                   | <-- Timer Install
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, ...url('about:blank')},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, ...stackTrace(['urlB.1', 'urlB.2'])},
      {ph: 'X', name: 'EvaluateScript', pid, tid, ts: baseTs + 10e3, dur: 30e3, ...url('urlC')},
      {ph: 'I', name: 'TimerInstall', pid, tid, ts: baseTs + 15e3, ...timerId(1)},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 55e3},
      {ph: 'X', name: 'TimerFire', pid, tid, ts: baseTs + 75e3, dur: 10e3, ...timerId(1)},
      {ph: 'X', name: 'TaskE', pid, tid, ts: baseTs + 80e3, dur: 5e3, ...stackTrace(['urlD'])},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'EvaluateScript');
    const taskD = tasks.find(task => task.event.name === 'TimerFire');
    const taskE = tasks.find(task => task.event.name === 'TaskE');

    expect(taskA.attributableURLs).toEqual(['urlB.1', 'urlB.2', 'urlC', 'urlD']);
    expect(taskB.attributableURLs).toEqual(['urlB.1', 'urlB.2']);
    expect(taskC.attributableURLs).toEqual(['urlB.1', 'urlB.2', 'urlC']);
    expect(taskD.attributableURLs).toEqual(['urlB.1', 'urlB.2', 'urlC']);
    expect(taskE.attributableURLs).toEqual(['urlB.1', 'urlB.2', 'urlC', 'urlD']);
  });

  it('should compute attributableURLs correctly across XHRs', () => {
    const baseTs = 1241250325;
    const url = s => ({args: {data: {url: s}}});
    const xhr = (s, readyState, stackTrace) => ({
      args: {
        data: {
          url: s,
          readyState,
          stackTrace: stackTrace && stackTrace.map(url => ({url})),
        },
      },
    });

    /*
    An artistic rendering of the below trace:
    ███████████████TaskA██████████████        ██████████TaskB███████████
      ██████EvaluateScript███████              ██XHRReadyStateChange4█
        █XHRReadyStateChange1█                      █TaskE█

    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'X', name: 'TaskA', ts: baseTs, pid, tid, dur: 70e3, ...url('about:blank')},
      {ph: 'X', name: 'EvaluateScript', ts: baseTs + 10e3, pid, tid, dur: 30e3, ...url('urlA')},
      {ph: 'X', name: 'XHRReadyStateChange', ts: baseTs + 15e3, pid, tid, dur: 15e3,
        ...xhr('urlXHR', 1)},
      {ph: 'X', name: 'TaskB', ts: baseTs + 80e3, pid, tid, dur: 20e3},
      {
        ph: 'X',
        name: 'XHRReadyStateChange',
        ts: baseTs + 85e3,
        pid,
        tid,
        dur: 15e3,
        ...xhr('urlXHR', 4, ['urlC']),
      }, // eslint-disable-line max-len
      {ph: 'X', name: 'TaskC', ts: baseTs + 89e3, pid, tid, dur: 4e3},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'TaskC');

    expect(taskA.attributableURLs).toEqual(['urlA']);
    expect(taskB.attributableURLs).toEqual(['urlA', 'urlC']);
    expect(taskC.attributableURLs).toEqual(['urlA', 'urlC']);
  });

  it('should compute attributableURLs correctly based on frame value', () => {
    const baseTs = 1241250325;
    const frame = (f, url) => ({args: {data: {frame: f, url}}});
    const stackTrace = (f, s) => ({args: {data: {frame: f, stackTrace: s.map(url => ({url}))}}});

    /*
    An artistic rendering of the below trace:
    ██TaskA██      ███████TaskB███████      ██TaskC███
     █Paint█        ██EvaluateScript█        █Layout█

    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'I', name: 'FrameCommittedInBrowser', pid, tid: tid + 1, ...frame('A', 'urlA')},
      {ph: 'I', name: 'FrameCommittedInBrowser', pid, tid: tid + 1, ...frame('B', 'about:blank')},
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 30e3},
      {ph: 'X', name: 'Paint', pid, tid, ts: baseTs + 10e3, dur: 10e3, ...frame('A')},
      {ph: 'X', name: 'TaskB', pid, tid, ts: baseTs + 50e3, dur: 20e3},
      {
        ph: 'X',
        name: 'EvaluateScript',
        pid,
        tid,
        ts: baseTs + 51e3,
        dur: 15e3,
        ...stackTrace('B', ['urlB']),
      }, // eslint-disable-line max-len
      {ph: 'X', name: 'TaskC', pid, tid, ts: baseTs + 90e3, dur: 5e3},
      {ph: 'X', name: 'Layout', pid, tid, ts: baseTs + 90e3, dur: 4e3, ...frame('B')},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'TaskC');

    expect(taskA.attributableURLs).toEqual(['urlA']);
    expect(taskB.attributableURLs).toEqual(['urlB']);
    expect(taskC.attributableURLs).toEqual(['urlB']);
  });

  it('should compute attributableURLs correctly between tasks with layout', () => {
    const baseTs = 1241250325;
    const url = s => ({args: {data: {url: s}}});

    /*
    An artistic rendering of the below trace:
    ████████TaskA█████████       ███TaskB██████    ███████████TaskC█████████████
      █EvaluateScript█             █Layout█         █EvaluateScript█  █Layout█
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 20e3, ...url('about:blank')},
      {ph: 'X', name: 'EvaluateScript', pid, tid, ts: baseTs + 5e3, dur: 10e3, ...url('urlA')},
      {ph: 'X', name: 'TaskB', pid, tid, ts: baseTs + 50e3, dur: 20e3},
      {ph: 'X', name: 'Layout', pid, tid, ts: baseTs + 55e3, dur: 10e3},
      {ph: 'X', name: 'TaskC', pid, tid, ts: baseTs + 80e3, dur: 50e3, ...url('about:blank')},
      {ph: 'X', name: 'EvaluateScript', pid, tid, ts: baseTs + 85e3, dur: 10e3, ...url('urlC')},
      {ph: 'X', name: 'Layout', pid, tid, ts: baseTs + 100e3, dur: 10e3},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'TaskC');
    const soloLayout = tasks.find(task => task.event.ts === baseTs + 55e3);
    const pairedLayout = tasks.find(task => task.event.ts === baseTs + 100e3);

    expect(taskA.attributableURLs).toEqual(['urlA']);
    expect(taskB.attributableURLs).toEqual(['urlA']);
    expect(taskC.attributableURLs).toEqual(['urlC']);
    expect(soloLayout.attributableURLs).toEqual(['urlA']);
    expect(pairedLayout.attributableURLs).toEqual(['urlC']);
  });

  it('should handle the last trace event not ending', () => {
    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA████████████|
      ████████████████████TaskB███████████████████|
                                            █TaskC|
                                                  ^ trace abruptly ended
    */
    const traceEvents = [
      ...boilerplateTrace,
      // These events would normally be accompanied by an 'E' event
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, args},
      {ph: 'B', name: 'TaskC', pid, tid, ts: baseTs + 100e3, args},
      {ph: 'I', name: 'MarkerToPushOutTraceEnd', pid, tid, ts: baseTs + 110e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    expect(tasks).toHaveLength(3);

    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'TaskC');
    expect(taskA).toMatchObject({
      parent: undefined,
      attributableURLs: [],

      children: [taskB],
      event: traceEvents[4],
      startTime: 0,
      endTime: 110,
      duration: 110,
      selfTime: 5,
      group: taskGroups.other,
      unbounded: true,
    });

    expect(taskB).toMatchObject({
      parent: taskA,
      attributableURLs: [],

      children: [taskC],
      event: traceEvents[5],
      startTime: 5,
      endTime: 110,
      duration: 105,
      selfTime: 95,
      group: taskGroups.other,
      unbounded: true,
    });
  });

  it('should handle nested events *starting* at the same timestamp correctly', () => {
    /*
    An artistic rendering of the below trace:
    █████████████TaskA█████████████
    ███████TaskB██████
    █TaskC█
                                   █████████████TaskD█████████████

    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'TaskC', pid, tid, ts: baseTs, args},
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 50e3, args},
      {ph: 'E', name: 'TaskC', pid, tid, ts: baseTs + 25e3, args},
      {ph: 'X', name: 'TaskD', pid, tid, ts: baseTs + 100e3, dur: 100e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    expect(tasks).toMatchObject([
      {event: {name: 'TaskA'}, parent: undefined, startTime: 0, endTime: 100},
      {event: {name: 'TaskB'}, parent: {event: {name: 'TaskA'}}, startTime: 0, endTime: 50},
      {event: {name: 'TaskC'}, parent: {event: {name: 'TaskB'}}, startTime: 0, endTime: 25},
      {event: {name: 'TaskD'}, parent: undefined, startTime: 100, endTime: 200},
    ]);
  });

  it('should handle nested events *ending* at the same timestamp correctly', () => {
    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA████████████|
      ████████████████████TaskB███████████████████|
                                            █TaskC|
                                                  ^ trace abruptly ended
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'X', name: 'TaskB', pid, tid, ts: baseTs + 50e3, dur: 50e3, args},
      {ph: 'B', name: 'TaskC', pid, tid, ts: baseTs + 75e3, args},
      {ph: 'X', name: 'TaskD', pid, tid, ts: baseTs + 100e3, dur: 100e3, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 100e3, args},
      {ph: 'E', name: 'TaskC', pid, tid, ts: baseTs + 100e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    expect(tasks).toMatchObject([
      {event: {name: 'TaskA'}, parent: undefined, startTime: 0, endTime: 100},
      {event: {name: 'TaskB'}, parent: {event: {name: 'TaskA'}}, startTime: 50, endTime: 100},
      {event: {name: 'TaskC'}, parent: {event: {name: 'TaskB'}}, startTime: 75, endTime: 100},
      {event: {name: 'TaskD'}, parent: undefined, startTime: 100, endTime: 200},
    ]);
  });

  it('should handle nested events of the same name', () => {
    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskANested██████████████████████████████████████████████
    ████████████████TaskB███████████████████
               ████TaskANested██████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskANested', pid, tid, ts: baseTs, args},
      {ph: 'X', name: 'TaskB', pid, tid, ts: baseTs, dur: 50e3, args},
      {ph: 'B', name: 'TaskANested', pid, tid, ts: baseTs + 25e3, args},
      {ph: 'E', name: 'TaskANested', pid, tid, ts: baseTs + 45e3, args},
      {ph: 'E', name: 'TaskANested', pid, tid, ts: baseTs + 100e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    expect(tasks).toMatchObject([
      {event: {name: 'TaskANested'}, parent: undefined, startTime: 0, endTime: 100},
      {event: {name: 'TaskB'}, parent: {event: {name: 'TaskANested'}}, startTime: 0, endTime: 50},
      {event: {name: 'TaskANested'}, parent: {event: {name: 'TaskB'}}, startTime: 25, endTime: 45},
    ]);
  });

  it('should handle incorrectly sorted events at task start', () => {
    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA██████████████████████████████████████████████
    █████████████████TaskB███████████████████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs, args},
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 50e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const [taskA, taskB] = tasks;
    expect(tasks).toEqual([
      {
        parent: undefined,
        attributableURLs: [],

        children: [taskB],
        event: traceEvents.find(event => event.name === 'TaskA'),
        startTime: 0,
        endTime: 100,
        duration: 100,
        selfTime: 50,
        group: taskGroups.other,
        unbounded: false,
      },
      {
        parent: taskA,
        attributableURLs: [],

        children: [],
        event: traceEvents.find(event => event.name === 'TaskB'),
        endEvent: traceEvents.find(event => event.ph === 'E' && event.name === 'TaskB'),
        startTime: 0,
        endTime: 50,
        duration: 50,
        selfTime: 50,
        group: taskGroups.other,
        unbounded: false,
      },
    ]);
  });

  it('should handle out-of-order 0 duration tasks', () => {
    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA██████████████████|█TaskB█  <-- duration of 0
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 100e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 100e3, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 100e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    expect(tasks).toEqual([
      {
        parent: undefined,
        attributableURLs: [],

        children: [],
        event: traceEvents.find(evt => evt.ph === 'B' && evt.name === 'TaskA'),
        endEvent: traceEvents.find(evt => evt.ph === 'E' && evt.name === 'TaskA'),
        startTime: 0,
        endTime: 100,
        duration: 100,
        selfTime: 100,
        group: taskGroups.other,
        unbounded: false,
      },
      {
        parent: undefined,
        attributableURLs: [],

        children: [],
        event: traceEvents.find(event => event.ph === 'B' && event.name === 'TaskB'),
        endEvent: traceEvents.find(event => event.ph === 'E' && event.name === 'TaskB'),
        startTime: 100,
        endTime: 100,
        duration: 0,
        selfTime: 0,
        group: taskGroups.other,
        unbounded: false,
      },
    ]);
  });

  it('should handle nested tasks of the same name', () => {
    /*
    An artistic rendering of the below trace:
      ████████████████SameName██████████████████
          ███████████SameName████████████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'SameName', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'SameName', pid, tid, ts: baseTs + 25e3, args},
      {ph: 'E', name: 'SameName', pid, tid, ts: baseTs + 75e3, args},
      {ph: 'E', name: 'SameName', pid, tid, ts: baseTs + 100e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    expect(tasks).toEqual([
      {
        parent: undefined,
        attributableURLs: [],

        children: [tasks[1]],
        event: traceEvents.find(event => event.name === 'SameName' && event.ts === baseTs),
        endEvent: traceEvents.find(evt => evt.name === 'SameName' && evt.ts === baseTs + 100e3),
        startTime: 0,
        endTime: 100,
        duration: 100,
        selfTime: 50,
        group: taskGroups.other,
        unbounded: false,
      },
      {
        parent: tasks[0],
        attributableURLs: [],

        children: [],
        event: traceEvents.find(event => event.ts === baseTs + 25e3),
        endEvent: traceEvents.find(evt => evt.name === 'SameName' && evt.ts === baseTs + 75e3),
        startTime: 25,
        endTime: 75,
        duration: 50,
        selfTime: 50,
        group: taskGroups.other,
        unbounded: false,
      },
    ]);
  });

  it('should handle child events that extend <1ms beyond parent event', () => {
    /*
    An artistic rendering of the below trace:
    ████████████████TaskA██████████████████
            █████████TaskB██████████████████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 25e3, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 100e3 - 50, args}, // this is invalid, but happens in practice
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 100e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const [taskA, taskB] = tasks;
    expect(tasks).toEqual([
      {
        parent: undefined,
        attributableURLs: [],

        children: [taskB],
        event: traceEvents.find(event => event.name === 'TaskA'),
        endEvent: traceEvents.find(evt => evt.ph === 'E' && evt.name === 'TaskA'),
        startTime: 0,
        endTime: 100,
        duration: 100,
        selfTime: 25,
        group: taskGroups.other,
        unbounded: false,
      },
      {
        parent: taskA,
        attributableURLs: [],

        children: [],
        event: traceEvents.find(evt => evt.ph === 'B' && evt.name === 'TaskB'),
        endEvent: traceEvents.find(evt => evt.ph === 'E' && evt.name === 'TaskB'),
        startTime: 25,
        endTime: 100,
        duration: 75,
        selfTime: 75,
        group: taskGroups.other,
        unbounded: false,
      },
    ]);
  });

  it('should handle child events that extend >1ms beyond parent event because missing E', () => {
    /*
    An artistic rendering of the below trace:
    ████████████████TaskA██████████████████
            █████████TaskB██████████████████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 25e3, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 100e3, args},
      {ph: 'I', name: 'MarkerToPushOutTraceEnd', pid, tid, ts: baseTs + 110e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const [taskA, taskB] = tasks;
    expect(tasks).toMatchObject([
      {
        parent: undefined,
        attributableURLs: [],

        children: [taskB],
        event: traceEvents.find(evt => evt.ph === 'B' && evt.name === 'TaskA'),
        endEvent: traceEvents.find(evt => evt.ph === 'E' && evt.name === 'TaskA'),
        startTime: 0,
        endTime: 100,
        duration: 100,
        selfTime: 25,
        group: taskGroups.other,
        unbounded: false,
      },
      {
        parent: taskA,
        attributableURLs: [],

        children: [],
        event: traceEvents.find(event => event.name === 'TaskB' && event.ph === 'B'),
        startTime: 25,
        endTime: 100,
        duration: 75,
        selfTime: 75,
        group: taskGroups.other,
        unbounded: true,
      },
    ]);
  });

  it('should handle child events that start <1ms before parent event', () => {
    /*
    An artistic rendering of the below trace:
    ████████████████TaskA██████████████████
            █████████TaskB██████████████
           ████████TaskC█████████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 25e3 + 50, args}, // this is invalid, but happens in practice
      {ph: 'B', name: 'TaskC', pid, tid, ts: baseTs + 25e3, args},
      {ph: 'E', name: 'TaskC', pid, tid, ts: baseTs + 60e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 90e3, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 100e3, args},
    ];

    traceEvents.filter(evt => !evt.cat).forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = run({traceEvents});
    const [taskA, taskB, taskC] = tasks;
    expect(tasks).toEqual([
      {
        parent: undefined,
        attributableURLs: [],

        children: [taskB],
        event: traceEvents.find(evt => evt.ph === 'B' && evt.name === 'TaskA'),
        endEvent: traceEvents.find(evt => evt.ph === 'E' && evt.name === 'TaskA'),
        startTime: 0,
        endTime: 100,
        duration: 100,
        selfTime: 35,
        group: taskGroups.other,
        unbounded: false,
      },
      {
        parent: taskA,
        attributableURLs: [],

        children: [taskC],
        event: traceEvents.find(evt => evt.ph === 'B' && evt.name === 'TaskB'),
        endEvent: traceEvents.find(evt => evt.ph === 'E' && evt.name === 'TaskB'),
        startTime: 25,
        endTime: 90,
        duration: 65,
        selfTime: 30,
        group: taskGroups.other,
        unbounded: false,
      },
      {
        parent: taskB,
        attributableURLs: [],

        children: [],
        event: traceEvents.find(evt => evt.ph === 'B' && evt.name === 'TaskC'),
        endEvent: traceEvents.find(evt => evt.ph === 'E' && evt.name === 'TaskC'),
        startTime: 25,
        endTime: 60,
        duration: 35,
        selfTime: 35,
        group: taskGroups.other,
        unbounded: false,
      },
    ]);
  });

  // Invalid sets of events.
  // All of these should have `traceEnd` pushed out to avoid falling into one of our mitigation scenarios.
  const invalidEventSets = [
    [
      // TaskA overlaps with TaskB, X first
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 115e3, args},
    ],
    [
      // TaskA overlaps with TaskB, B first
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'X', name: 'TaskB', pid, tid, ts: baseTs + 5e3, dur: 100e3, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 90e3, args},
    ],
    [
      // TaskA overlaps with TaskB, both B/E
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 90e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 95e3, args},
    ],
    [
      // TaskA is missing a B event
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 115e3, args},
    ],
    [
      // TaskB is missing a B event after an X
      {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 10e3, args},
    ],
    [
      // TaskA is starting .5ms too late, but TaskB already has a child
      {ph: 'B', name: 'TaskA', pid, tid, ts: baseTs + 500, args},
      {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs, args},
      {ph: 'X', name: 'TaskC', pid, tid, ts: baseTs + 50, dur: 100, args},
      {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 100e3, args},
      {ph: 'E', name: 'TaskA', pid, tid, ts: baseTs + 115e3, args},
      {ph: 'I', name: 'MarkerToPushOutTraceEnd', pid, tid, ts: baseTs + 200e3, args},
    ],
  ];

  for (const invalidEvents of invalidEventSets) {
    it('should throw on invalid task input', () => {
      const traceEvents = [...boilerplateTrace, ...invalidEvents];
      traceEvents.filter(evt => !evt.cat).forEach(evt => {
        evt.cat = 'devtools.timeline';
        evt.args = evt.args || args;
      });
      expect(() => run({traceEvents})).toThrow();
    });
  }

  describe('printTaskTreeToDebugString', () => {
    it('should print a nice-looking task tree', () => {
      const traceEvents = [
        ...boilerplateTrace,
        {ph: 'X', name: 'TaskA', pid, tid, ts: baseTs, dur: 100e3, args},
        {ph: 'B', name: 'TaskB', pid, tid, ts: baseTs + 5e3, args},
        {ph: 'X', name: 'TaskC', pid, tid, ts: baseTs + 10e3, dur: 30e3, args},
        {ph: 'E', name: 'TaskB', pid, tid, ts: baseTs + 55e3, args},
        {ph: 'X', name: 'TaskD', pid, tid, ts: baseTs + 60e3, dur: 30e3, args},
      ];

      traceEvents.filter(evt => !evt.cat).forEach(evt => {
        evt.cat = 'devtools.timeline';
        evt.args = evt.args || args;
      });

      const tasks = run({traceEvents});
      const taskTreeAsString = MainThreadTasks.printTaskTreeToDebugString(tasks, {printWidth: 50});
      expect(trimTrailingWhitespace(taskTreeAsString)).toMatchInlineSnapshot(`
        "Trace Duration: 100ms
        Range: [0, 100]
        █ = 2.00ms

        █████████████████████████A█████████████████████████
          ████████████B█████████████  ███████D████████
             ███████C████████

        A = TaskA
        B = TaskB
        C = TaskC
        D = TaskD"
      `);
    });
  });
});
