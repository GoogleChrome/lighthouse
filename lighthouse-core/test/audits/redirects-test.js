/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const RedirectsAudit = require('../../audits/redirects.js');
const assert = require('assert').strict;
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const createTestTrace = require('../create-test-trace.js');

/* eslint-env jest */

const FAILING_THREE_REDIRECTS = [{
  requestId: '1',
  startTime: 0,
  priority: 'VeryHigh',
  url: 'http://example.com/',
  timing: {receiveHeadersEnd: 11},
}, {
  requestId: '1:redirect',
  startTime: 11,
  priority: 'VeryHigh',
  url: 'https://example.com/',
  timing: {receiveHeadersEnd: 12},
}, {
  requestId: '1:redirect:redirect',
  startTime: 12,
  priority: 'VeryHigh',
  url: 'https://m.example.com/',
  timing: {receiveHeadersEnd: 17},
}, {
  requestId: '1:redirect:redirect:redirect',
  startTime: 17,
  priority: 'VeryHigh',
  url: 'https://m.example.com/final',
  timing: {receiveHeadersEnd: 19},
}];

const FAILING_TWO_REDIRECTS = [{
  requestId: '1',
  startTime: 445,
  priority: 'VeryHigh',
  url: 'http://lisairish.com/',
  timing: {receiveHeadersEnd: 446},
}, {
  requestId: '1:redirect',
  startTime: 446,
  priority: 'VeryHigh',
  url: 'https://lisairish.com/',
  timing: {receiveHeadersEnd: 447},
}, {
  requestId: '1:redirect:redirect',
  startTime: 447,
  priority: 'VeryHigh',
  url: 'https://www.lisairish.com/',
  timing: {receiveHeadersEnd: 448},
}];

const SUCCESS_ONE_REDIRECT = [{
  requestId: '1',
  startTime: 135,
  priority: 'VeryHigh',
  url: 'https://lisairish.com/',
  timing: {receiveHeadersEnd: 136},
}, {
  requestId: '1:redirect',
  startTime: 136,
  priority: 'VeryHigh',
  url: 'https://www.lisairish.com/',
  timing: {receiveHeadersEnd: 139},
}];

const SUCCESS_NOREDIRECT = [{
  requestId: '1',
  startTime: 135.873,
  priority: 'VeryHigh',
  url: 'https://www.google.com/',
  timing: {receiveHeadersEnd: 140},
}];

describe('Performance: Redirects audit', () => {
  const mockArtifacts = (networkRecords, finalUrl) => {
    const devtoolsLog = networkRecordsToDevtoolsLog(networkRecords);

    return {
      traces: {defaultPass: createTestTrace({traceEnd: 5000})},
      devtoolsLogs: {defaultPass: devtoolsLog},
      URL: {finalUrl},
    };
  };

  it('fails when 3 redirects detected', () => {
    const artifacts = mockArtifacts(FAILING_THREE_REDIRECTS, 'https://m.example.com/final');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      assert.equal(Math.round(output.score * 100) / 100, 0.37);
      assert.equal(output.details.items.length, 4);
      assert.equal(output.numericValue, 1890);
    });
  });

  it('fails when 2 redirects detected', () => {
    const artifacts = mockArtifacts(FAILING_TWO_REDIRECTS, 'https://www.lisairish.com/');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      assert.equal(Math.round(output.score * 100) / 100, 0.46);
      assert.equal(output.details.items.length, 3);
      assert.equal(Math.round(output.numericValue), 1110);
    });
  });

  it('passes when one redirect detected', () => {
    const artifacts = mockArtifacts(SUCCESS_ONE_REDIRECT, 'https://www.lisairish.com/');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      // If === 1 redirect, perfect score is expected, regardless of latency
      assert.equal(output.score, 1);
      // We will still generate a table and show wasted time
      assert.equal(output.details.items.length, 2);
      assert.equal(Math.round(output.numericValue), 780);
    });
  });

  it('passes when no redirect detected', () => {
    const artifacts = mockArtifacts(SUCCESS_NOREDIRECT, 'https://www.google.com/');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      assert.equal(output.score, 1);
      assert.equal(output.details.items.length, 0);
      assert.equal(output.numericValue, 0);
    });
  });
});
