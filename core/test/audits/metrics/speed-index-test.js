/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import Audit from '../../../audits/metrics/speed-index.js';
import * as constants from '../../../config/constants.js';
import {readJson} from '../../test-utils.js';

const pwaTrace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const pwaDevtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

const options = Audit.defaultOptions;

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


describe('Performance: speed-index audit', () => {
  it('works on a real trace', () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: pwaTrace},
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    return Audit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.numericValue, 605);
    });
  }, 10000);
});
