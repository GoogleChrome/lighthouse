/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import FMPAudit from '../../../audits/metrics/first-meaningful-paint.js';
import {Audit} from '../../../audits/audit.js';
import * as constants from '../../../config/constants.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/artifacts/progressive-app/trace.json', import.meta);
const devtoolsLogs = readJson('../../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);

/**
 * @param {{
 * {LH.SharedFlagsSettings['formFactor']} formFactor
 * {LH.SharedFlagsSettings['throttlingMethod']} throttlingMethod
 * }} param0
 */
const getFakeContext = ({formFactor, throttlingMethod}) => ({
  options: FMPAudit.defaultOptions,
  computedCache: new Map(),
  settings: {
    formFactor: formFactor,
    throttlingMethod,
    screenEmulation: constants.screenEmulationMetrics[formFactor],
  },
});
describe('Performance: first-meaningful-paint audit', () => {
  it('computes FMP correctly for valid trace', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {[Audit.DEFAULT_PASS]: trace},
      devtoolsLogs: {[Audit.DEFAULT_PASS]: devtoolsLogs},
      URL: getURLArtifactFromDevtoolsLog(devtoolsLogs),
    };
    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const fmpResult = await FMPAudit.audit(artifacts, context);

    assert.equal(fmpResult.score, 1);
    assert.equal(fmpResult.numericValue, 228.814);
    expect(fmpResult.displayValue).toBeDisplayString('0.2\xa0s');
  });

  it('computes FMP correctly for simulated', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {[Audit.DEFAULT_PASS]: trace},
      devtoolsLogs: {[Audit.DEFAULT_PASS]: devtoolsLogs},
      URL: getURLArtifactFromDevtoolsLog(devtoolsLogs),
    };
    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'simulate'});
    const fmpResult = await FMPAudit.audit(artifacts, context);

    expect({
      score: fmpResult.score,
      numericValue: fmpResult.numericValue,
    }).toMatchSnapshot();
  });
});
