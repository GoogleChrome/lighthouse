/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {minifyTrace} from '../../lib/minify-trace.js';
import MetricsAudit from '../../audits/metrics.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';
import {defaultSettings} from '../../config/constants.js';

const trace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const settings = JSON.parse(JSON.stringify(defaultSettings));

/**
 * @return {LH.Audit.Context}
 */
function createAuditContext() {
  return /** @type {LH.Audit.Context} */ (/** @type {unknown} */ ({
    settings: {...settings, throttlingMethod: 'simulate'},
    options: {},
    computedCache: new Map(),
  }));
}

describe('minify-trace', () => {
  it('removes DevTools-only trace categories', () => {
    const minifiedTrace = minifyTrace({
      traceEvents: [
        {name: 'TracingStartedInBrowser', cat: 'disabled-by-default-devtools.timeline', ph: 'I',
          pid: 1, tid: 1, ts: 0, dur: 0,
          args: {data: {frames: [{frame: 'frame', processId: 1, url: 'https://example.com/'}]}}},
        {name: 'navigationStart', cat: 'blink.user_timing', ph: 'R', pid: 1, tid: 1, ts: 1, dur: 0,
          args: {data: {documentLoaderURL: 'https://example.com/'}}},
        {name: 'RunTask', cat: 'disabled-by-default-lighthouse', ph: 'X', pid: 1, tid: 1, ts: 2,
          dur: 2000, args: {}},
        {name: 'DroppedFrame', cat: 'disabled-by-default-devtools.timeline.frame', ph: 'I',
          pid: 1, tid: 1, ts: 3, dur: 0, args: {}},
        {name: 'EventLatency', cat: 'latencyInfo', ph: 'X', pid: 1, tid: 1, ts: 4, dur: 1,
          args: {}},
        {name: 'ProfileChunk', cat: 'disabled-by-default-v8.cpu_profiler', ph: 'I',
          pid: 1, tid: 1, ts: 5, dur: 0, args: {}},
      ],
    });

    expect(minifiedTrace.traceEvents.map(event => event.name)).toEqual([
      'TracingStartedInBrowser',
      'navigationStart',
      'RunTask',
    ]);
  });

  it('has identical metrics to unminified', async () => {
    /** @type {LH.Artifacts} */
    const artifacts = /** @type {LH.Artifacts} */ (/** @type {unknown} */ ({
      GatherContext: {gatherMode: 'navigation'},
      Trace: trace,
      DevtoolsLog: devtoolsLog,
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      SourceMaps: [],
      HostDPR: 1,
    }));
    const beforeResult = await MetricsAudit.audit(artifacts, createAuditContext());
    const beforeDetails = /** @type {LH.Audit.Details.DebugData} */ (beforeResult.details);
    const before = beforeDetails.items[0];
    const beforeSize = JSON.stringify(trace).length;

    const minifiedTrace = minifyTrace(trace);
    artifacts.Trace = minifiedTrace;
    const afterResult = await MetricsAudit.audit(artifacts, createAuditContext());
    const afterDetails = /** @type {LH.Audit.Details.DebugData} */ (afterResult.details);
    const after = afterDetails.items[0];
    const afterSize = JSON.stringify(minifiedTrace).length;

    for (const key of Object.keys(after)) {
      // Speed Index is expected to differ because of screenshot throttling.
      // Trace End can also differ if the last event was unimportant.
      if (/speedIndex|traceEnd/i.test(key)) {
        delete before[key];
        delete after[key];
      }
    }

    // It should greatly reduce the size of the trace.
    expect(afterSize).toBeLessThan(beforeSize * 0.2);
    // And not affect the metrics.
    expect(after).toEqual(before);
  });
});
