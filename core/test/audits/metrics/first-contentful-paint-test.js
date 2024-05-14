/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import FcpAudit from '../../../audits/metrics/first-contentful-paint.js';
import * as constants from '../../../config/constants.js';
import {readJson} from '../../test-utils.js';

const pwaTrace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const pwaDevtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const frameTrace = readJson('../../fixtures/traces/frame-metrics-m90.json', import.meta);
const frameDevtoolsLog = readJson('../../fixtures/traces/frame-metrics-m90.devtools.log.json', import.meta);

const options = FcpAudit.defaultOptions;

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
      traces: {
        [FcpAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [FcpAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.numericValue, 498.87);
  });

  it('evaluates a modern trace correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [FcpAudit.DEFAULT_PASS]: frameTrace,
      },
      devtoolsLogs: {
        [FcpAudit.DEFAULT_PASS]: frameDevtoolsLog,
      },
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);
    assert.equal(result.score, 0.05);
    assert.equal(result.numericValue, 5668.275);
  });
});
