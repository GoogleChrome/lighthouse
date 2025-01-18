/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {readJson} from '../test-utils.js';
import LongTasks from '../../audits/long-tasks.js';
import {defaultSettings} from '../../config/constants.js';
import {createTestTrace} from '../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

const redirectTrace = readJson('../fixtures/artifacts/redirect/trace.json', import.meta);
const redirectDevtoolsLog = readJson('../fixtures/artifacts/redirect/devtoolslog.json', import.meta);

const BASE_TS = 12345e3;
const TASK_URL = 'https://pwa.rocks';

/**
 * @param {Number} count
 * @param {Number} duration
 * @param {Boolean} withChildTasks
 */
function generateTraceWithLongTasks(args) {
  const {count, duration = 200, withChildTasks = false, networkRecords} = args;
  const traceTasks = [{ts: BASE_TS, duration: 0}];
  for (let i = 1; i <= count; i++) {
    /* Generates a top-level task w/ the following breakdown:
    task -> {
      ts,
      duration,
      children -> [{ts, duration, url}, ...],
    }
    Child tasks should start after the parent task and end before it.
    Top-level tasks will take on the attributable URL from it's children.
    */
    const ts = BASE_TS + i * 1000;
    const task = {ts, duration};
    task.children = [];
    if (withChildTasks) {
      task.children.push({
        ts: ts + duration / 10,
        duration: duration / 3,
        url: TASK_URL,
      });
      task.children.push({
        ts: ts + duration / 2,
        duration: duration / 3,
        url: TASK_URL,
      });
    }
    traceTasks.push(task);
  }
  return createTestTrace({
    largestContentfulPaint: BASE_TS + 15,
    topLevelTasks: traceTasks,
    timeOrigin: BASE_TS,
    traceEnd: BASE_TS + 20_000,
    networkRecords,
  });
}

describe('Long tasks audit', () => {
  const devtoolsLog = networkRecordsToDevtoolsLog([{
    url: TASK_URL,
    priority: 'High',
  }]);
  const URL = {
    requestedUrl: TASK_URL,
    mainDocumentUrl: TASK_URL,
    finalDisplayedUrl: TASK_URL,
  };

  let context;

  beforeEach(() => {
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';

    context = {
      computedCache: new Map(),
      settings,
    };
  });

  it('should pass and be non-applicable if there are no long tasks', async () => {
    const artifacts = {
      URL,
      traces: {defaultPass: generateTraceWithLongTasks({count: 0})},
      devtoolsLogs: {defaultPass: devtoolsLog},
      GatherContext: {gatherMode: 'navigation'},
    };
    const result = await LongTasks.audit(artifacts, context);
    expect(result.details.items).toHaveLength(0);
    expect(result.score).toBe(1);
    expect(result.displayValue).toBeUndefined();
    expect(result.notApplicable).toBeTruthy();
    expect(result.metricSavings).toEqual({TBT: 0});
  });

  it('should return a list of long tasks with duration >= 50 ms', async () => {
    const artifacts = {
      URL,
      traces: {defaultPass: generateTraceWithLongTasks({count: 4})},
      devtoolsLogs: {defaultPass: devtoolsLog},
      GatherContext: {gatherMode: 'navigation'},
    };
    const result = await LongTasks.audit(artifacts, context);
    expect(result.details.items).toMatchObject([
      {url: 'Unattributable', duration: 200, startTime: 1000},
      {url: 'Unattributable', duration: 200, startTime: 2000},
      {url: 'Unattributable', duration: 200, startTime: 3000},
      {url: 'Unattributable', duration: 200, startTime: 4000},
    ]);
    expect(result.score).toBe(0);
    expect(result.displayValue).toBeDisplayString('4 long tasks found');
    expect(result.notApplicable).toBeFalsy();
    expect(result.metricSavings).toEqual({TBT: 600}); // 4 * (200ms - 50ms)
  });

  it('should filter out tasks with duration less than 50 ms', async () => {
    const trace = createTestTrace({
      timeOrigin: BASE_TS,
      traceEnd: BASE_TS + 20_000,
      topLevelTasks: [
        {ts: BASE_TS, duration: 1},
        {ts: BASE_TS + 1000, duration: 30},
        {ts: BASE_TS + 2000, duration: 100},
        {ts: BASE_TS + 3000, duration: 25},
        {ts: BASE_TS + 4000, duration: 50},
      ],
    });
    const artifacts = {
      URL,
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await LongTasks.audit(artifacts, context);
    expect(result.details.items).toMatchObject([
      {url: 'Unattributable', duration: 100, startTime: 2000},
      {url: 'Unattributable', duration: 50, startTime: 4000},
    ]);
    expect(result.score).toBe(0);
    expect(result.displayValue).toBeDisplayString('2 long tasks found');
    expect(result.metricSavings).toEqual({TBT: 50}); // (100ms - 50ms) + (50ms - 50ms)
  });

  it('should not filter out tasks with duration >= 50 ms only after throttling', async () => {
    const networkRecords = [{
      url: TASK_URL,
      priority: 'High',
      timing: {connectEnd: 50, connectStart: 0.01, sslStart: 25, sslEnd: 40},
      transferSize: 1000,
    }];

    const artifacts = {
      URL,
      traces: {defaultPass: generateTraceWithLongTasks({count: 4, duration: 25, networkRecords})},
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
      GatherContext: {gatherMode: 'navigation'},
    };
    const context = {
      computedCache: new Map(),
      settings: {
        precomputedLanternData: {
          additionalRttByOrigin: {[TASK_URL]: 0},
          serverResponseTimeByOrigin: {[TASK_URL]: 100},
        },
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 100,
          throughputKbps: 10000,
          cpuSlowdownMultiplier: 4,
        },
      },
    };
    const result = await LongTasks.audit(artifacts, context);
    expect(result.details.items).toMatchObject([
      {duration: 100, startTime: 600},
      {duration: 100, startTime: 700},
      {duration: 100, startTime: 800},
      {duration: 100, startTime: 900},
    ]);
    expect(result.score).toBe(0);
    expect(result.details.items).toHaveLength(4);
    expect(result.displayValue).toBeDisplayString('4 long tasks found');
    expect(result.metricSavings).toEqual({TBT: 200}); // 4 * (100ms - 50ms)
  });

  it('should populate url when tasks have an attributable url', async () => {
    const trace = generateTraceWithLongTasks({count: 1, duration: 300, withChildTasks: true});
    const artifacts = {
      URL,
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      GatherContext: {gatherMode: 'navigation'},
    };
    const result = await LongTasks.audit(artifacts, context);
    expect(result.details.items).toMatchObject([
      {url: TASK_URL, duration: 300, startTime: 1000},
    ]);
    expect(result.score).toBe(0);
    expect(result.displayValue).toBeDisplayString('1 long task found');
    expect(result.metricSavings).toEqual({TBT: 250}); // 300ms - 50ms
  });

  it('should include more than 20 tasks in debugData', async () => {
    const numTasks = 50;
    const topLevelTasks = [];
    for (let i = 0; i < numTasks; i++) {
      topLevelTasks.push({
        ts: BASE_TS + i * 1000,
        duration: 55,
      });
    }

    const trace = createTestTrace({
      timeOrigin: BASE_TS,
      traceEnd: BASE_TS + 100_000,
      topLevelTasks,
    });
    const artifacts = {
      URL,
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await LongTasks.audit(artifacts, context);
    expect(result.details.items).toHaveLength(20);
    expect(result.score).toBe(0);
    expect(result.displayValue).toBeDisplayString('20 long tasks found');
    expect(result.metricSavings).toEqual({TBT: 249.99}); // (55ms - 50ms) * 50

    const debugData = result.details.debugData;
    expect(debugData).toMatchObject({
      type: 'debugdata',
      urls: ['Unattributable'],
    });

    expect(debugData.tasks).toHaveLength(numTasks);
    for (let i = 0; i < debugData.tasks.length; i++) {
      const task = debugData.tasks[i];
      expect(task).toStrictEqual({
        urlIndex: 0,
        startTime: i * 1000,
        duration: 55,
        other: 55,
      });
    }
  });

  it('should break down debugData time based on child tasks', async () => {
    const trace = generateTraceWithLongTasks({count: 1, duration: 300, withChildTasks: true});
    const artifacts = {
      URL,
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      GatherContext: {gatherMode: 'navigation'},
    };
    const result = await LongTasks.audit(artifacts, context);

    expect(result).toMatchObject({
      score: 0,
      displayValue: expect.toBeDisplayString('1 long task found'),
      details: {
        items: [
          {url: TASK_URL, duration: 300, startTime: 1000},
        ],
      },
    });

    const debugData = result.details.debugData;
    expect(debugData).toStrictEqual({
      type: 'debugdata',
      urls: [TASK_URL],
      tasks: [{
        urlIndex: 0,
        startTime: 1000,
        duration: 300,
        other: 100,
        scriptEvaluation: 200,
      }],
    });
  });

  it('should find long tasks from a real trace', async () => {
    const artifacts = {
      URL,
      traces: {defaultPass: redirectTrace},
      devtoolsLogs: {defaultPass: redirectDevtoolsLog},
      GatherContext: {gatherMode: 'navigation'},
    };
    const result = await LongTasks.audit(artifacts, context);

    expect(result).toMatchObject({
      score: 0,
      displayValue: expect.toBeDisplayString('2 long tasks found'),
      details: {
        items: [{
          url: expect.stringContaining('https://'),
          startTime: expect.toBeApproximately(2686.9, 1),
          duration: expect.toBeApproximately(89.2, 1),
        }, {
          url: expect.stringContaining('https://'),
          startTime: expect.toBeApproximately(2236.7, 1),
          duration: expect.toBeApproximately(71.1, 1),
        }],
      },
    });
    expect(result.metricSavings.TBT).toBeApproximately(60.29);

    const debugData = result.details.debugData;
    expect(debugData).toStrictEqual({
      type: 'debugdata',
      urls: [
        expect.stringContaining('https://'),
        expect.stringContaining('https://'),
      ],
      tasks: [{
        urlIndex: 0,
        startTime: 2686.9,
        duration: 89.2,
        garbageCollection: 6.7,
        other: 0.2,
        parseHTML: 0.1,
        scriptEvaluation: 81.3,
        scriptParseCompile: 0.3,
        styleLayout: 0.5,
      }, {
        urlIndex: 1,
        startTime: 2236.7,
        duration: 71.1,
        garbageCollection: 1.4,
        other: 1.1,
        parseHTML: 0.1,
        scriptEvaluation: 62.7,
        scriptParseCompile: 5.1,
        styleLayout: 0.8,
      }],
    });
  });
});
