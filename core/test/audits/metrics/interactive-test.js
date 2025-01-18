/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import Interactive from '../../../audits/metrics/interactive.js';
import * as constants from '../../../config/constants.js';
import {readJson} from '../../test-utils.js';

const acceptableTrace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const acceptableDevToolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const redirectTrace = readJson('../../fixtures/artifacts/redirect/trace.json', import.meta);
const redirectDevToolsLog = readJson('../../fixtures/artifacts/redirect/devtoolslog.json', import.meta);

const options = Interactive.defaultOptions;

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
describe('Performance: interactive audit', () => {
  it('should compute interactive', () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [Interactive.DEFAULT_PASS]: acceptableTrace,
      },
      devtoolsLogs: {
        [Interactive.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    return Interactive.audit(artifacts, context).then(output => {
      assert.equal(output.score, 1);
      assert.equal(Math.round(output.numericValue), 1582);
      expect(output.displayValue).toBeDisplayString('1.6\xa0s');
    });
  });

  it('should compute interactive on pages with redirect', () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [Interactive.DEFAULT_PASS]: redirectTrace,
      },
      devtoolsLogs: {
        [Interactive.DEFAULT_PASS]: redirectDevToolsLog,
      },
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    return Interactive.audit(artifacts, context).then(output => {
      assert.equal(output.score, 0.97);
      expect(output.numericValue).toMatchInlineSnapshot(`2776.05`);
    });
  });
});
