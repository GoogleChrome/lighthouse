/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import TBTAudit from '../../../audits/metrics/total-blocking-time.js';
import * as constants from '../../../config/constants.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const lcpTrace = readJson('../../fixtures/traces/lcp-m78.json', import.meta);
const lcpDevtoolsLog = readJson('../../fixtures/traces/lcp-m78.devtools.log.json', import.meta);

const defaultOptions = TBTAudit.defaultOptions;

function generateArtifacts({gatherMode = 'navigation', trace, devtoolsLog}) {
  return {
    GatherContext: {gatherMode},
    traces: {[TBTAudit.DEFAULT_PASS]: trace},
    devtoolsLogs: {[TBTAudit.DEFAULT_PASS]: devtoolsLog},
    URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
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

describe('Performance: total-blocking-time audit', () => {
  it('evaluates Total Blocking Time metric properly', async () => {
    const artifacts = generateArtifacts({trace, devtoolsLog});
    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    const output = await TBTAudit.audit(artifacts, context);
    expect(output.numericValue).toBeCloseTo(48.3, 1);
    expect(output.score).toBe(1);
    expect(output.displayValue).toBeDisplayString('50\xa0ms');
  });

  it('adjusts scoring based on form factor', async () => {
    const artifactsMobile = generateArtifacts({trace: lcpTrace,
      devtoolsLog: lcpDevtoolsLog});
    const contextMobile = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    const outputMobile = await TBTAudit.audit(artifactsMobile, contextMobile);
    expect(outputMobile.numericValue).toBeCloseTo(333, 1);
    expect(outputMobile.score).toBe(0.75);
    expect(outputMobile.displayValue).toBeDisplayString('330\xa0ms');

    const artifactsDesktop = generateArtifacts({trace: lcpTrace,
      devtoolsLog: lcpDevtoolsLog});
    const contextDesktop = getFakeContext({formFactor: 'desktop', throttlingMethod: 'provided'});

    const outputDesktop = await TBTAudit.audit(artifactsDesktop, contextDesktop);
    expect(outputDesktop.numericValue).toBeCloseTo(333, 1);
    expect(outputDesktop.score).toBe(0.53);
    expect(outputDesktop.displayValue).toBeDisplayString('330\xa0ms');
  });

  it('marks metric not applicable (throttlingMethod=simulate, gatherMode=timespan)', async () => {
    const artifacts = generateArtifacts({gatherMode: 'timespan', trace, devtoolsLog});
    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'simulate'});

    const output = await TBTAudit.audit(artifacts, context);
    expect(output.notApplicable).toBe(true);
  });
});
