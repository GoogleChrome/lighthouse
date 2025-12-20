/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TotalByteWeight = require('../../../audits/byte-efficiency/total-byte-weight.js');
const assert = require('assert').strict;
const URL = require('url').URL;
const options = TotalByteWeight.defaultOptions;
const networkRecordsToDevtoolsLog = require('../../network-records-to-devtools-log.js');

/* eslint-env jest */

function generateRequest(url, size, baseUrl = 'http://google.com/') {
  const parsedUrl = new URL(url, baseUrl);
  const scheme = parsedUrl.protocol.slice(0, -1);
  return {
    url: parsedUrl.href,
    finished: true,
    transferSize: size * 1024,
    responseReceivedTime: 1000,
    endTime: 2000,
    parsedURL: {
      scheme,
    },
  };
}

function generateArtifacts(records) {
  if (records[0] && records[0].length > 1) {
    records = records.map(args => generateRequest(...args));
  }

  return {
    devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(records)},
  };
}

describe('Total byte weight audit', () => {
  it('passes when requests are small', () => {
    const artifacts = generateArtifacts([
      ['file.html', 30],
      ['file.js', 50],
      ['file.jpg', 70],
    ]);

    return TotalByteWeight.audit(artifacts, {options, computedCache: new Map()}).then(result => {
      assert.strictEqual(result.numericValue, 150 * 1024);
      assert.strictEqual(result.score, 1);
      const results = result.details.items;
      assert.strictEqual(results.length, 3);
      assert.strictEqual(result.extendedInfo.value.totalCompletedRequests, 3);
      assert.strictEqual(results[0].totalBytes, 71680, 'results are sorted');
    });
  });

  it('scores in the middle when a mixture of small and large requests are used', () => {
    const artifacts = generateArtifacts([
      ['file.html', 30],
      ['file.js', 50],
      ['file.jpg', 70],
      ['file-large.jpg', 1000],
      ['file-xlarge.jpg', 3000],
      ['small1.js', 5],
      ['small2.js', 5],
      ['small3.js', 5],
      ['small4.js', 5],
      ['small5.js', 5],
      ['small6.js', 5],
    ]);

    return TotalByteWeight.audit(artifacts, {options, computedCache: new Map()}).then(result => {
      assert.ok(0.40 < result.score && result.score < 0.6, 'score is around 0.5');
      assert.strictEqual(result.numericValue, 4180 * 1024);
      const results = result.details.items;
      assert.strictEqual(results.length, 10, 'results are clipped at top 10');
      assert.strictEqual(result.extendedInfo.value.totalCompletedRequests, 11);
    });
  });

  it('fails when requests are huge', () => {
    const artifacts = generateArtifacts([
      ['file.html', 3000],
      ['file.js', 5000],
      ['file.jpg', 7000],
    ]);

    return TotalByteWeight.audit(artifacts, {options, computedCache: new Map()}).then(result => {
      assert.strictEqual(result.numericValue, 15000 * 1024);
      assert.strictEqual(result.score, 0);
    });
  });
});
