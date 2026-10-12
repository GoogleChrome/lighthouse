/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import PredictivePerf from '../../audits/predictive-perf.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';

const acceptableTrace = readJson('../fixtures/artifacts/paul/trace.json', import.meta);
const acceptableDevToolsLog = readJson('../fixtures/artifacts/paul/devtoolslog.json', import.meta);

describe('Performance: predictive performance audit', () => {
  it('should compute the predicted values', async () => {
    const artifacts = {
      URL: getURLArtifactFromDevtoolsLog(acceptableDevToolsLog),
      GatherContext: {gatherMode: 'navigation'},
      Trace: acceptableTrace,
      DevtoolsLog: acceptableDevToolsLog,
      SourceMaps: [],
      HostDPR: 1,
    };
    const context = {computedCache: new Map(), settings: {locale: 'en'}};

    const output = await PredictivePerf.audit(artifacts, context);
    const metrics = output.details.items[0];
    for (const [key, value] of Object.entries(metrics)) {
      metrics[key] = value === undefined ? value : Math.round(value);
    }
    if (process.env.INTERNAL_LANTERN_USE_TRACE !== undefined) {
      // The devtoolsLog includes 2 high-priority CORS `Preflight` requests that are not emitted
      // as `ResourceSendRequest` trace events, which lowers simulated TTI in trace mode.
      expect(output.displayValue).toBeDisplayString('2,920 ms');
      expect(metrics).toMatchObject({
        optimisticTTI: 1816,
        pessimisticTTI: 3823,
        roughEstimateOfTTI: 2920,
      });
      metrics.optimisticTTI = 2132;
      metrics.pessimisticTTI = 3981;
      metrics.roughEstimateOfTTI = 3149;
    } else {
      expect(output.displayValue).toBeDisplayString('3,150 ms');
    }
    expect(metrics).toMatchSnapshot();
  });
});
