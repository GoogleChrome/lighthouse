/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import LCPAudit from '../../../audits/metrics/largest-contentful-paint.js';
import * as constants from '../../../config/constants.js';
import {readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/traces/lcp-m78.json', import.meta);
const devtoolsLog = readJson('../../fixtures/traces/lcp-m78.devtools.log.json', import.meta);

const defaultOptions = LCPAudit.defaultOptions;

function generateArtifacts({trace, devtoolsLog, HostUserAgent}) {
  return {
    GatherContext: {gatherMode: 'navigation'},
    traces: {[LCPAudit.DEFAULT_PASS]: trace},
    devtoolsLogs: {[LCPAudit.DEFAULT_PASS]: devtoolsLog},
    HostUserAgent,
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
});
