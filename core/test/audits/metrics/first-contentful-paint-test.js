/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import FcpAudit from '../../../audits/metrics/first-contentful-paint.js';
import * as constants from '../../../config/constants.js';
import {TraceProcessor} from '../../../lib/tracehouse/trace-processor.js';
import {createTestTrace, rootFrame} from '../../create-test-trace.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const pwaTrace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const pwaDevtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const frameTrace = readJson('../../fixtures/traces/frame-metrics-m90.json', import.meta);
const frameDevtoolsLog = readJson('../../fixtures/traces/frame-metrics-m90.devtools.log.json', import.meta);

const options = FcpAudit.defaultOptions;

/**
 * @param {Array<Partial<LH.TraceEvent> & Pick<LH.TraceEvent, 'name'|'ts'|'args'>>} events
 * @return {LH.Trace}
 */
function createTimespanTrace(events) {
  const trace = createTestTrace({});
  trace.traceEvents.push({
    name: 'clock_sync',
    cat: 'loading',
    ph: 'I',
    pid: 1,
    tid: 1,
    ts: 500_000,
    dur: 0,
    args: {sync_id: TraceProcessor.TIMESPAN_MARKER_ID},
  });

  for (const event of events) {
    if (event.name === 'SoftNavigationStart') event.args.frame = rootFrame;
  }
  trace.traceEvents.push(...(events));
  return trace;
}

/**
 * @param {{
 * {LH.SharedFlagsSettings['formFactor']} formFactor
 * {LH.SharedFlagsSettings['throttlingMethod']} throttlingMethod
 * }} param0
 */
const getFakeContext = ({formFactor, throttlingMethod}) => ({
  options: options,
  computedCache: new Map(),
  settings: {
    formFactor: formFactor,
    throttlingMethod,
    screenEmulation: constants.screenEmulationMetrics[formFactor],
  },
});


describe('Performance: first-contentful-paint audit', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      Trace: pwaTrace,
      DevtoolsLog: pwaDevtoolsLog,
      URL: getURLArtifactFromDevtoolsLog(pwaDevtoolsLog),
      SourceMaps: [],
      HostDPR: 1,
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.numericValue, 498.87);
  });

  it('evaluates a modern trace correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      Trace: frameTrace,
      DevtoolsLog: frameDevtoolsLog,
      URL: getURLArtifactFromDevtoolsLog(frameDevtoolsLog),
      SourceMaps: [],
      HostDPR: 1,
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);
    assert.equal(result.score, 0.05);
    assert.equal(result.numericValue, 5668.275);
  });

  it('evaluates exactly one soft navigation in timespan mode', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      Trace: createTimespanTrace([
        {
          name: 'SoftNavigationStart',
          cat: 'loading',
          ph: 'I',
          pid: 1,
          tid: 1,
          ts: 1_000_000,
          args: /** @type {LH.TraceEvent['args']} */ ({
            context: {
              firstContentfulPaint: 1_080_000,
              performanceTimelineNavigationId: 1,
              timeOrigin: 1_000_000,
            },
          }),
        },
        {
          name: 'RunTask',
          cat: 'devtools.timeline',
          ph: 'X',
          pid: 1,
          tid: 1,
          ts: 1_100_000,
          dur: 10_000,
          args: {},
        },
      ]),
      DevtoolsLog: [],
      URL: {requestedUrl: '', mainDocumentUrl: '', finalDisplayedUrl: ''},
      SourceMaps: [],
      HostDPR: 1,
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);

    assert.equal(result.numericValue, 80);
    assert.equal(result.notApplicable, undefined);
  });

  it('evaluates the only FCP across multiple soft navigations', async () => {
    const startEvent = {
      name: 'SoftNavigationStart',
      cat: 'loading',
      ph: 'I',
      pid: 1,
      tid: 1,
      args: /** @type {LH.TraceEvent['args']} */ ({
        context: {
          firstContentfulPaint: 1_080_000,
          performanceTimelineNavigationId: 1,
          timeOrigin: 1_000_000,
        },
      }),
      ts: 1_000_000,
    };
    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      Trace: createTimespanTrace([
        startEvent,
        {
          ...startEvent,
          ts: 2_000_000,
          args: /** @type {LH.TraceEvent['args']} */ ({
            context: {performanceTimelineNavigationId: 2, timeOrigin: 2_000_000},
          }),
        },
      ]),
      DevtoolsLog: [],
      URL: {requestedUrl: '', mainDocumentUrl: '', finalDisplayedUrl: ''},
      SourceMaps: [],
      HostDPR: 1,
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);

    assert.equal(result.numericValue, 80);
    assert.equal(result.notApplicable, undefined);
  });
});
