/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const CriticalRequestChains = require('../../audits/critical-request-chains.js');
const assert = require('assert').strict;
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

const FAILING_CHAIN_RECORDS = [
  {
    endTime: 5,
    responseReceivedTime: 5,
    startTime: 0,
    url: 'https://example.com/',
    priority: 'VeryHigh',
  }, {
    endTime: 16,
    responseReceivedTime: 14,
    startTime: 11,
    url: 'https://example.com/b.js',
    priority: 'VeryHigh',
    initiator: {
      type: 'parser',
      url: 'https://example.com/',
    },
  }, {
    endTime: 17,
    responseReceivedTime: 15,
    startTime: 12,
    url: 'https://example.com/c.js',
    priority: 'VeryHigh',
    initiator: {
      type: 'parser',
      url: 'https://example.com/',
    },
  },
];

const PASSING_CHAIN_RECORDS = [
  {
    endTime: 1,
    responseReceivedTime: 1,
    startTime: 0,
    url: 'https://example.com/',
    priority: 'VeryHigh',
  },
];

const PASSING_CHAIN_RECORDS_2 = [
  {
    url: 'http://localhost:10503/offline-ready.html',
    startTime: 33552.036878,
    endTime: 33552.285438,
    responseReceivedTime: 33552.275677,
    transferSize: 1849,
    priority: 'VeryHigh',
  },
];

const EMPTY_CHAIN_RECORDS = [];

const mockArtifacts = (chainNetworkRecords) => {
  const devtoolsLog = networkRecordsToDevtoolsLog(chainNetworkRecords);
  const finalUrl = chainNetworkRecords[0] ? chainNetworkRecords[0].url : 'https://example.com';

  return {
    devtoolsLogs: {
      [CriticalRequestChains.DEFAULT_PASS]: devtoolsLog,
    },
    URL: {finalUrl},
  };
};

describe('Performance: critical-request-chains audit', () => {
  it('calculates the correct chain result for failing example', () => {
    const artifacts = mockArtifacts(FAILING_CHAIN_RECORDS);
    const context = {computedCache: new Map()};
    return CriticalRequestChains.audit(artifacts, context).then(output => {
      expect(output.displayValue).toBeDisplayString('2 chains found');
      assert.equal(output.score, 0);
      assert.ok(output.details);
    });
  });

  it('calculates the correct chain result for passing example', () => {
    const artifacts = mockArtifacts(PASSING_CHAIN_RECORDS);
    const context = {computedCache: new Map()};
    return CriticalRequestChains.audit(artifacts, context).then(output => {
      assert.equal(output.details.longestChain.duration, 1000);
      assert.equal(output.displayValue, '');
      assert.equal(output.score, 1);
    });
  });

  it('calculates the correct chain result for passing example (no 2.)', () => {
    const artifacts = mockArtifacts(PASSING_CHAIN_RECORDS_2);
    const context = {computedCache: new Map()};
    return CriticalRequestChains.audit(artifacts, context).then(output => {
      assert.equal(output.displayValue, '');
      assert.equal(output.score, 1);
    });
  });

  it('throws an error for no main resource found for empty example', () => {
    const artifacts = mockArtifacts(EMPTY_CHAIN_RECORDS);
    const context = {computedCache: new Map()};
    return CriticalRequestChains.audit(artifacts, context).then(_ => {
      throw new Error('should have failed');
    }).catch(err => {
      assert.ok(err.message.includes('Unable to identify the main resource'));
    });
  });
});
