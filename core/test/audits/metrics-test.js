/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';

import MetricsAudit from '../../audits/metrics.js';
import {Interactive} from '../../computed/metrics/interactive.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';
import {defaultSettings} from '../../config/constants.js';

const pwaTrace = readJson('../fixtures/artifacts/progressive-app/trace.json', import.meta);
const pwaDevtoolsLog = readJson('../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);
const lcpTrace = readJson('../fixtures/artifacts/paul/trace.json', import.meta);
const lcpDevtoolsLog = readJson('../fixtures/artifacts/paul/devtoolslog.json', import.meta);
const lcpImageTrace = readJson('../fixtures/traces/amp-m86.trace.json', import.meta);
const lcpImageDevtoolsLog = readJson('../fixtures/traces/amp-m86.devtoolslog.json', import.meta);
const lcpAllFramesTrace = readJson('../fixtures/traces/frame-metrics-m89.json', import.meta);
const lcpAllFramesDevtoolsLog = readJson('../fixtures/traces/frame-metrics-m89.devtools.log.json', import.meta);
const clsAllFramesTrace = readJson('../fixtures/traces/frame-metrics-m90.json', import.meta);
const clsAllFramesDevtoolsLog = readJson('../fixtures/traces/frame-metrics-m90.devtools.log.json', import.meta);
const jumpyClsTrace = readJson('../fixtures/traces/jumpy-cls-m90.json', import.meta);
const jumpyClsDevtoolsLog = readJson('../fixtures/traces/jumpy-cls-m90.devtoolslog.json', import.meta);

const settings = JSON.parse(JSON.stringify(defaultSettings));

describe('Performance: metrics', () => {
  // TODO(15841): investigate failures
  if (process.env.INTERNAL_LANTERN_USE_TRACE !== undefined) {
    return;
  }

  it('evaluates valid input correctly', async () => {
    const URL = getURLArtifactFromDevtoolsLog(pwaDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'simulate'},
      computedCache: new Map(),
    };
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input correctly (throttlingMethod=provided)', async () => {
    const URL = getURLArtifactFromDevtoolsLog(pwaDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'provided'},
      computedCache: new Map(),
    };
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with lcp) correctly', async () => {
    const URL = getURLArtifactFromDevtoolsLog(lcpDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'simulate'},
      computedCache: new Map(),
    };
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with lcp from all frames) correctly', async () => {
    const URL = getURLArtifactFromDevtoolsLog(lcpAllFramesDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'provided'},
      computedCache: new Map(),
    };
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with image lcp) correctly', async () => {
    const URL = getURLArtifactFromDevtoolsLog(lcpImageDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpImageTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpImageDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'simulate'},
      computedCache: new Map(),
    };
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('leaves CLS undefined in an old trace without weighted scores', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'simulate'},
      computedCache: new Map(),
    };
    const {details} = await MetricsAudit.audit(artifacts, context);
    expect(details.items[0]).toMatchObject({
      cumulativeLayoutShift: undefined,
      observedCumulativeLayoutShift: undefined,
    });
  });

  it('evaluates CLS correctly across all frames', async () => {
    const URL = getURLArtifactFromDevtoolsLog(clsAllFramesDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: clsAllFramesTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: clsAllFramesDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'provided'},
      computedCache: new Map(),
    };
    const {details} = await MetricsAudit.audit(artifacts, context);

    expect(details.items[0]).toMatchObject({
      cumulativeLayoutShift: expect.toBeApproximately(0.026463, 6),
      observedCumulativeLayoutShift: expect.toBeApproximately(0.026463, 6),
    });
  });

  it('does not fail the entire audit when TTI errors', async () => {
    const URL = getURLArtifactFromDevtoolsLog(pwaDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const mockTTIFn = jestMock.spyOn(Interactive, 'request');
    mockTTIFn.mockRejectedValueOnce(new Error('TTI failed'));
    const context = {
      settings: {...settings, throttlingMethod: 'simulate'},
      computedCache: new Map(),
    };
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0].interactive).toEqual(undefined);
  });

  it('evaluates CLS correctly', async () => {
    const URL = getURLArtifactFromDevtoolsLog(jumpyClsDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: jumpyClsTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: jumpyClsDevtoolsLog,
      },
    };

    const context = {
      settings: {...settings, throttlingMethod: 'simulate'},
      computedCache: new Map(),
    };
    const {details} = await MetricsAudit.audit(artifacts, context);
    expect(details.items[0]).toMatchObject({
      cumulativeLayoutShift: expect.toBeApproximately(2.268816, 6),
      observedCumulativeLayoutShift: expect.toBeApproximately(2.268816, 6),
    });
  });
});
