/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../../audits/metrics/estimated-input-latency.js');
const assert = require('assert').strict;
const options = Audit.defaultOptions;

const pwaTrace = require('../../fixtures/traces/progressive-app-m60.json');

function generateArtifactsWithTrace(trace) {
  return {
    traces: {[Audit.DEFAULT_PASS]: trace},
    devtoolsLogs: {[Audit.DEFAULT_PASS]: []},
  };
}
/* eslint-env jest */

describe('Performance: estimated-input-latency audit', () => {
  it('evaluates valid input correctly', () => {
    const artifacts = generateArtifactsWithTrace(pwaTrace);
    const settings = {throttlingMethod: 'provided'};
    const context = {options, settings, computedCache: new Map()};
    return Audit.audit(artifacts, context).then(output => {
      assert.equal(Math.round(output.numericValue * 10) / 10, 17.1);
      assert.equal(output.score, 1);
      expect(output.displayValue).toBeDisplayString('20\xa0ms');
    });
  });
});
