/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Interactive = require('../../../audits/metrics/interactive.js');
const assert = require('assert').strict;
const options = Interactive.defaultOptions;

const acceptableTrace = require('../../fixtures/traces/progressive-app-m60.json');
const acceptableDevToolsLog =
    require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

const redirectTrace = require('../../fixtures/traces/site-with-redirect.json');
const redirectDevToolsLog = require('../../fixtures/traces/site-with-redirect.devtools.log.json');


/* eslint-env jest */
describe('Performance: interactive audit', () => {
  it('should compute interactive', () => {
    const artifacts = {
      traces: {
        [Interactive.DEFAULT_PASS]: acceptableTrace,
      },
      devtoolsLogs: {
        [Interactive.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    };

    const context = {options, settings: {throttlingMethod: 'provided'}, computedCache: new Map()};
    return Interactive.audit(artifacts, context).then(output => {
      assert.equal(output.score, 1);
      assert.equal(Math.round(output.numericValue), 1582);
      expect(output.displayValue).toBeDisplayString('1.6\xa0s');
    });
  });

  it('should compute interactive on pages with redirect', () => {
    const artifacts = {
      traces: {
        [Interactive.DEFAULT_PASS]: redirectTrace,
      },
      devtoolsLogs: {
        [Interactive.DEFAULT_PASS]: redirectDevToolsLog,
      },
    };

    const context = {options, settings: {throttlingMethod: 'provided'}, computedCache: new Map()};
    return Interactive.audit(artifacts, context).then(output => {
      assert.equal(output.score, 0.97);
      assert.equal(Math.round(output.numericValue), 2712);
      expect(output.displayValue).toBeDisplayString('2.7\xa0s');
    });
  });
});
