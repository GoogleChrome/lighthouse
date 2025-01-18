/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import {URL} from 'url';

import TotalByteWeight from '../../../audits/byte-efficiency/total-byte-weight.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

const options = TotalByteWeight.defaultOptions;

function generateRequest(url, size, baseUrl = 'http://google.com/') {
  const parsedUrl = new URL(url, baseUrl);
  const scheme = parsedUrl.protocol.slice(0, -1);
  return {
    url: parsedUrl.href,
    finished: true,
    transferSize: size * 1024,
    responseHeadersEndTime: 1000,
    networkEndTime: 2000,
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
    URL: {},
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

  it('ignores non-network requests', async () => {
    const artifacts = generateArtifacts([
      {url: 'https://example.com/file.js', transferSize: 10_000},
      {url: 'data:image/jpeg;base64,', protocol: 'data', transferSize: 100_000},
      {url: 'blob:1234', protocol: 'blob', transferSize: 100_000},
    ]);

    const result = await TotalByteWeight.audit(artifacts, {options, computedCache: new Map()});
    expect(result.numericValue).toEqual(10_000);
  });

  it('ignores requests with falsy transfer size', async () => {
    const artifacts = generateArtifacts([
      {url: 'https://example.com/file.html', transferSize: 5_000},
      {url: 'https://example.com/file.js', transferSize: NaN},
    ]);

    const result = await TotalByteWeight.audit(artifacts, {options, computedCache: new Map()});
    expect(result.numericValue).toEqual(5_000);
  });
});
