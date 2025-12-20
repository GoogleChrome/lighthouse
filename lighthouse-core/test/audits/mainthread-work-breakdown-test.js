/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const PageExecutionTimings = require('../../audits/mainthread-work-breakdown.js');
const assert = require('assert').strict;
const options = PageExecutionTimings.defaultOptions;

const acceptableTrace = require('../fixtures/traces/progressive-app-m60.json');
const siteWithRedirectTrace = require('../fixtures/traces/site-with-redirect.json');
const loadTrace = require('../fixtures/traces/load.json');
const errorTrace = require('../fixtures/traces/no_fmp_event.json');

const acceptableTraceExpectations = {
  parseHTML: 14,
  styleLayout: 308,
  paintCompositeRender: 87,
  scriptEvaluation: 215,
  scriptParseCompile: 25,
  garbageCollection: 48,
  other: 663,
};
const siteWithRedirectTraceExpectations = {
  parseHTML: 84,
  styleLayout: 275,
  paintCompositeRender: 12,
  scriptEvaluation: 145,
  scriptParseCompile: 38,
  garbageCollection: 46,
  other: 184,
};
const loadTraceExpectations = {
  parseHTML: 25,
  styleLayout: 131,
  paintCompositeRender: 44,
  scriptEvaluation: 347,
  garbageCollection: 3,
  other: 382,
};

describe('Performance: page execution timings audit', () => {
  function keyOutput(output) {
    const keyedOutput = {};
    for (const item of output.details.items) {
      keyedOutput[item.group] = Math.round(item.duration);
    }
    return keyedOutput;
  }

  it('should compute the correct pageExecutionTiming values for the pwa trace', async () => {
    const artifacts = {traces: {defaultPass: acceptableTrace}};

    const output = await PageExecutionTimings.audit(artifacts, {options, computedCache: new Map()});
    assert.deepStrictEqual(keyOutput(output), acceptableTraceExpectations);
    assert.equal(Math.round(output.numericValue), 1360);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 0.98);
  });

  it('should compute the correct values when simulated', async () => {
    const artifacts = {traces: {defaultPass: acceptableTrace}};

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 3}};
    const context = {options, settings, computedCache: new Map()};
    const output = await PageExecutionTimings.audit(artifacts, context);

    const keyedOutput = keyOutput(output);
    for (const key of Object.keys(acceptableTraceExpectations)) {
      const actual = keyedOutput[key];
      const expected = acceptableTraceExpectations[key] * 3;
      assert.ok(Math.abs(actual - expected) <= 2, `expected ${expected} got ${actual}`);
    }

    assert.equal(Math.round(output.numericValue), 4081);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 0.49);
  });

  it('should compute the correct values for the redirect trace', async () => {
    const artifacts = {traces: {defaultPass: siteWithRedirectTrace}};

    const output = await PageExecutionTimings.audit(artifacts, {options, computedCache: new Map()});
    assert.deepStrictEqual(keyOutput(output), siteWithRedirectTraceExpectations);
    assert.equal(Math.round(output.numericValue), 784);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 1);
  });

  it('should compute the correct values for the load trace', async () => {
    const artifacts = {traces: {defaultPass: {traceEvents: loadTrace}}};

    const output = await PageExecutionTimings.audit(artifacts, {options, computedCache: new Map()});
    assert.deepStrictEqual(keyOutput(output), loadTraceExpectations);
    assert.equal(Math.round(output.numericValue), 933);
    assert.equal(output.details.items.length, 6);
    assert.equal(output.score, 1);
  });

  it('should get no data when no events are present', () => {
    const artifacts = {traces: {defaultPass: errorTrace}};

    const context = {options, computedCache: new Map()};
    return PageExecutionTimings.audit(artifacts, context).then(output => {
      assert.equal(output.details.items.length, 0);
      assert.equal(output.score, 1);
      assert.equal(Math.round(output.numericValue), 0);
    });
  });
});
