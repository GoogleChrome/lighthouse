/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import LCPAudit from '../../../audits/metrics/largest-contentful-paint.js';
import * as constants from '../../../config/constants.js';
import {TraceProcessor} from '../../../lib/tracehouse/trace-processor.js';
import {createTestTrace, rootFrame} from '../../create-test-trace.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/traces/lcp-m78.json', import.meta);
const devtoolsLog = readJson('../../fixtures/traces/lcp-m78.devtools.log.json', import.meta);

const defaultOptions = LCPAudit.defaultOptions;

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
    if (event.name === 'SoftNavigationStart' ||
        event.name === 'largestContentfulPaint::CandidateForSoftNavigation') {
      event.args.frame = rootFrame;
    }
  }
  trace.traceEvents.push(...(events));
  return trace;
}

function generateArtifacts({trace, devtoolsLog, HostUserAgent}) {
  return {
    URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
    GatherContext: {gatherMode: 'navigation'},
    Trace: trace,
    DevtoolsLog: devtoolsLog,
    HostUserAgent,
    SourceMaps: [],
    HostDPR: 1,
  };
}

/**
 * @param {{
 * {LH.SharedFlagsSettings['formFactor']} formFactor
 * {LH.SharedFlagsSettings['throttlingMethod']} throttlingMethod
 * }} param0
 */
const getFakeContext = ({formFactor, throttlingMethod}) => ({
  options: defaultOptions,
  computedCache: new Map(),
  settings: {
    formFactor: formFactor,
    throttlingMethod,
    screenEmulation: constants.screenEmulationMetrics[formFactor],
  },
});

describe('Performance: largest-contentful-paint audit', () => {
  it('adjusts scoring based on form factor', async () => {
    const artifactsMobile = generateArtifacts({
      trace,
      devtoolsLog,
    });
    const contextMobile = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    const outputMobile = await LCPAudit.audit(artifactsMobile, contextMobile);
    expect(outputMobile.numericValue).toBeCloseTo(1121.711, 1);
    expect(outputMobile.score).toBe(1);
    expect(outputMobile.displayValue).toBeDisplayString('1.1\xa0s');

    const artifactsDesktop = generateArtifacts({
      trace,
      devtoolsLog,
    });
    const contextDesktop = getFakeContext({formFactor: 'desktop', throttlingMethod: 'provided'});

    const outputDesktop = await LCPAudit.audit(artifactsDesktop, contextDesktop);
    expect(outputDesktop.numericValue).toBeCloseTo(1121.711, 1);
    expect(outputDesktop.score).toBe(0.92);
    expect(outputDesktop.displayValue).toBeDisplayString('1.1\xa0s');
  });

  it('evaluates exactly one soft navigation in timespan mode', async () => {
    const artifacts = {
      URL: {requestedUrl: '', mainDocumentUrl: '', finalDisplayedUrl: ''},
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
            context: {performanceTimelineNavigationId: 1, timeOrigin: 1_000_000},
          }),
        },
        {
          name: 'largestContentfulPaint::CandidateForSoftNavigation',
          cat: 'loading',
          ph: 'I',
          pid: 1,
          tid: 1,
          ts: 1_100_000,
          args: /** @type {LH.TraceEvent['args']} */ ({
            data: {performanceTimelineNavigationId: 1},
          }),
        },
        {
          name: 'RunTask',
          cat: 'devtools.timeline',
          ph: 'X',
          pid: 1,
          tid: 1,
          ts: 1_200_000,
          dur: 10_000,
          args: {},
        },
      ]),
      DevtoolsLog: [],
      HostUserAgent: '',
      SourceMaps: [],
      HostDPR: 1,
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await LCPAudit.audit(artifacts, context);

    expect(result.numericValue).toBe(100);
    expect(result.notApplicable).toBeUndefined();
  });

  it('is not applicable when the soft navigation has no LCP candidate', async () => {
    const artifacts = {
      URL: {requestedUrl: '', mainDocumentUrl: '', finalDisplayedUrl: ''},
      GatherContext: {gatherMode: 'timespan'},
      Trace: createTimespanTrace([{
        name: 'SoftNavigationStart',
        cat: 'loading',
        ph: 'I',
        pid: 1,
        tid: 1,
        ts: 1_000_000,
        args: /** @type {LH.TraceEvent['args']} */ ({
          context: {performanceTimelineNavigationId: 1, timeOrigin: 1_000_000},
        }),
      }]),
      DevtoolsLog: [],
      HostUserAgent: '',
      SourceMaps: [],
      HostDPR: 1,
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await LCPAudit.audit(artifacts, context);

    expect(result.notApplicable).toBe(true);
  });

  it('evaluates the only LCP across multiple soft navigations', async () => {
    const artifacts = {
      URL: {requestedUrl: '', mainDocumentUrl: '', finalDisplayedUrl: ''},
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
            context: {performanceTimelineNavigationId: 1, timeOrigin: 1_000_000},
          }),
        },
        {
          name: 'largestContentfulPaint::CandidateForSoftNavigation',
          cat: 'loading',
          ph: 'I',
          pid: 1,
          tid: 1,
          ts: 1_100_000,
          args: /** @type {LH.TraceEvent['args']} */ ({
            data: {performanceTimelineNavigationId: 1},
          }),
        },
        {
          name: 'SoftNavigationStart',
          cat: 'loading',
          ph: 'I',
          pid: 1,
          tid: 1,
          ts: 2_000_000,
          args: /** @type {LH.TraceEvent['args']} */ ({
            context: {performanceTimelineNavigationId: 2, timeOrigin: 2_000_000},
          }),
        },
      ]),
      DevtoolsLog: [],
      HostUserAgent: '',
      SourceMaps: [],
      HostDPR: 1,
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await LCPAudit.audit(artifacts, context);

    expect(result.numericValue).toBe(100);
    expect(result.notApplicable).toBeUndefined();
  });
});
