/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
const Audit = require('../../../audits/metrics/first-contentful-paint.js');
const assert = require('assert').strict;
const options = Audit.defaultOptions;

const pwaTrace = require('../../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Performance: first-contentful-paint audit', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = {
      traces: {
        [Audit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [Audit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const settings = {throttlingMethod: 'provided'};
    const result = await Audit.audit(artifacts, {settings, options, computedCache: new Map()});
    assert.equal(result.score, 1);
    assert.equal(result.numericValue, 498.87);
  });
});
