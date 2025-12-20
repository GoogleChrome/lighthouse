/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FastPWAAudit = require('../../audits/load-fast-enough-for-pwa.js');
const mobileSlow4GThrottling = require('../../config/constants.js').throttling.mobileSlow4G;
const assert = require('assert').strict;
const createTestTrace = require('../create-test-trace.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

const trace = require('../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');


/* eslint-env jest */
describe('PWA: load-fast-enough-for-pwa audit', () => {
  it('returns boolean based on TTI value', () => {
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };

    const settings = {throttlingMethod: 'devtools', throttling: mobileSlow4GThrottling};
    return FastPWAAudit.audit(artifacts, {settings, computedCache: new Map()}).then(result => {
      assert.equal(result.score, 1, 'fixture trace is not passing audit');
      assert.equal(result.numericValue, 1582.189);
    });
  });

  it('fails a bad TTI value', async () => {
    const topLevelTasks = [
      {ts: 1000, duration: 100},
      {ts: 3000, duration: 100},
      {ts: 5000, duration: 100},
      {ts: 9000, duration: 100},
      {ts: 12000, duration: 100},
      {ts: 14900, duration: 100},
    ];
    const longTrace = createTestTrace({navigationStart: 0, traceEnd: 20000, topLevelTasks});
    const devtoolsLog = networkRecordsToDevtoolsLog([{url: 'https://example.com'}]);

    const artifacts = {
      traces: {defaultPass: longTrace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };

    const settings = {throttlingMethod: 'devtools', throttling: mobileSlow4GThrottling};
    return FastPWAAudit.audit(artifacts, {settings, computedCache: new Map()}).then(result => {
      assert.equal(result.score, 0, 'not failing a long TTI value');
      assert.equal(result.numericValue, 15000);
      expect(result.displayValue).toBeDisplayString('Interactive at 15.0\xa0s');
      assert.ok(result.explanation);
    });
  });

  it('respects the observed result when throttling is preset', async () => {
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };

    const settings = {throttlingMethod: 'devtools', throttling: mobileSlow4GThrottling};
    const result = await FastPWAAudit.audit(artifacts, {settings, computedCache: new Map()});
    assert.equal(Math.round(result.numericValue), 1582);
  });

  it('overrides with simulated result when throttling is modified', async () => {
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };

    const settings = {throttlingMethod: 'provided', throttling: {rttMs: 40, throughput: 100000}};
    const result = await FastPWAAudit.audit(artifacts, {settings, computedCache: new Map()});
    expect(result.numericValue).toBeGreaterThan(2000); // If not overridden this would be 1582
    expect(Math.round(result.numericValue)).toMatchSnapshot();
  });

  it('overrides when throttling is modified but method is not "provided"', async () => {
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };

    const settings = {throttlingMethod: 'devtools', throttling: {rttMs: 40, throughput: 100000}};
    const result = await FastPWAAudit.audit(artifacts, {settings, computedCache: new Map()});
    expect(result.numericValue).toBeGreaterThan(2000); // If not overridden this would be 1582
  });

  it('overrides when throttling is "provided" and fails the simulated TTI value', async () => {
    const topLevelTasks = [
      {ts: 1000, duration: 1000},
      {ts: 3000, duration: 1000},
      {ts: 5000, duration: 1000},
      {ts: 9000, duration: 1000},
      {ts: 12000, duration: 1000},
      {ts: 14900, duration: 1000},
    ];
    const longTrace = createTestTrace({navigationStart: 0, traceEnd: 20000, topLevelTasks});

    const artifacts = {
      traces: {defaultPass: longTrace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };

    const settings = {throttlingMethod: 'provided', throttling: {rttMs: 40, throughput: 100000}};
    const result = await FastPWAAudit.audit(artifacts, {settings, computedCache: new Map()});
    expect(result.displayValue)
      .toBeDisplayString('Interactive on simulated mobile network at 24.9\xa0s');
    expect(result.numericValue).toBeGreaterThan(10000);
  });
});
