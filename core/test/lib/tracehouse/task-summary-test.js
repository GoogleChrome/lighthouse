/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getJavaScriptURLs,
  getAttributableURLForTask,
  getExecutionTimingsByURL,
} from '../../../lib/tracehouse/task-summary.js';
import {NetworkRecorder} from '../../../lib/network-recorder.js';
import {MainThreadTasks} from '../../../lib/tracehouse/main-thread-tasks.js';
import {TraceProcessor} from '../../../lib/tracehouse/trace-processor.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {taskGroups} from '../../../lib/tracehouse/task-groups.js';
import {readJson} from '../../test-utils.js';

const ampTrace = readJson('../../fixtures/traces/amp-m86.trace.json', import.meta);
const ampDevtoolsLog = readJson('../../fixtures/traces/amp-m86.devtoolslog.json', import.meta);

function getTasks(trace) {
  const {mainThreadEvents, frames, timestamps} = TraceProcessor.processTrace(trace);
  return MainThreadTasks.getMainThreadTasks(mainThreadEvents, frames, timestamps.traceEnd);
}

describe('Task Summaries', () => {
  describe('getJavaScriptURLs', () => {
    it('returns no URLs for no records', () => {
      const urls = getJavaScriptURLs([]);
      expect(urls).toEqual(new Set());
    });

    it('returns the script URLs from a set of network records', () => {
      const records = NetworkRecorder.recordsFromLogs(ampDevtoolsLog);
      const urls = getJavaScriptURLs(records);
      for (const url of urls) {
        expect(url).toMatch(/^https:\/\/cdn.ampproject.org.*js$/);
      }
      expect(urls.size).toEqual(13);
    });
  });

  describe('getAttributableURLForTask', () => {
    const networkRecords = NetworkRecorder.recordsFromLogs(ampDevtoolsLog);
    const jsUrls = getJavaScriptURLs(networkRecords);
    const tasks = getTasks(ampTrace);
    // The exact task doesn't matter.
    const attributableTask = tasks.find(task => task.attributableURLs.length > 1);
    const clonableTask = {...attributableTask, parent: undefined, children: []};
    const knownJsUrl = 'https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js';

    it('gets an attributable URL', () => {
      const url = getAttributableURLForTask(attributableTask, jsUrls);
      expect(url).toEqual(knownJsUrl);
    });

    it('uses a script URL even if not the first attributable URL', () => {
      const clonedTask = JSON.parse(JSON.stringify(clonableTask));
      clonedTask.attributableURLs = [
        'https://something.com',
        'https://something.com/scripty.js',
        knownJsUrl,
      ];
      const url = getAttributableURLForTask(clonedTask, jsUrls);
      expect(url).toEqual(knownJsUrl);
    });

    it('falls back to the first attributable URL if none of the script URLs are known', () => {
      const clonedTask = JSON.parse(JSON.stringify(clonableTask));
      clonedTask.attributableURLs = [
        'https://something.com/page.html',
        'https://something.com/scripty.js',
        'https://example.com/another-script.js',
      ];
      const url = getAttributableURLForTask(clonedTask, jsUrls);
      expect(url).toEqual('https://something.com/page.html');
    });

    it('falls back to more specific browser tasks if no attributable URLs', () => {
      const clonedTask = JSON.parse(JSON.stringify(clonableTask));
      clonedTask.attributableURLs = [];
      clonedTask.event.name = 'CpuProfiler::StartProfiling';
      const url = getAttributableURLForTask(clonedTask, jsUrls);
      expect(url).toEqual('Browser');
    });

    it('falls back to more specific browser tasks if no attributable URLs', () => {
      const clonedTask = JSON.parse(JSON.stringify(clonableTask));
      clonedTask.attributableURLs = [];
      clonedTask.event.name = 'V8.GCCompactor';
      const url = getAttributableURLForTask(clonedTask, jsUrls);
      expect(url).toEqual('Browser GC');
    });

    it('falls back to "Unattributable" for a generic task if no attributable URLs', () => {
      const clonedTask = JSON.parse(JSON.stringify(clonableTask));
      clonedTask.attributableURLs = [];
      const url = getAttributableURLForTask(clonedTask, jsUrls);
      expect(url).toEqual('Unattributable');
    });

    it('falls back to "Unattributable" for a generic task if attributed to about:blank', () => {
      const clonedTask = JSON.parse(JSON.stringify(clonableTask));
      clonedTask.attributableURLs = ['about:blank'];
      const url = getAttributableURLForTask(clonedTask, jsUrls);
      expect(url).toEqual('Unattributable');
    });
  });

  describe('getExecutionTimingsByURL', () => {
    const devtoolsLog = networkRecordsToDevtoolsLog([
      {url: 'https://example.com'},
      {url: 'https://example.com/script.js'},
    ]);
    const networkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
    const tasks = [{
      attributableURLs: [
        'https://example.com/script.js',
      ],
      selfTime: 2,
      group: taskGroups.styleLayout,
    }, {
      attributableURLs: [
        'https://example.com',
        'https://someother.com/unknown-script.js',
      ],
      selfTime: 3,
      group: taskGroups.paintCompositeRender,
    }, {
      attributableURLs: [],
      selfTime: 5,
      group: taskGroups.scriptEvaluation,
      event: {name: 'MajorGC'},
    }, {
      attributableURLs: [],
      selfTime: 7,
      group: taskGroups.garbageCollection,
      event: {name: 'RunTask'},
    }];

    it('summarizes tasks', () => {
      const timings = getExecutionTimingsByURL(tasks, networkRecords);
      expect(timings).toEqual(new Map([
        ['https://example.com/script.js', {styleLayout: 2}],
        ['https://example.com', {paintCompositeRender: 3}],
        ['Browser GC', {scriptEvaluation: 5}],
        ['Unattributable', {garbageCollection: 7}],
      ]));
    });
  });
});
