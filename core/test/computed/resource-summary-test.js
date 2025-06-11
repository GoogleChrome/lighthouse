/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {ResourceSummary} from '../../computed/resource-summary.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

function mockArtifacts(networkRecords) {
  return {
    devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
    URL: {
      requestedUrl: networkRecords[0].url,
      mainDocumentUrl: networkRecords[0].url,
      finalDisplayedUrl: networkRecords[0].url,
    },
  };
}

describe('Resource summary computed', () => {
  let artifacts;
  let context;
  beforeEach(() => {
    artifacts = mockArtifacts([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
      {url: 'http://cdn.example.com/script.js', resourceType: 'Script', transferSize: 50},
      {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
    ]);
    context = {computedCache: new Map()};
  });

  it('includes all resource types, regardless of whether page contains them', async () => {
    const result = await ResourceSummary.request(artifacts, context);
    assert.equal(Object.keys(result).length, 9);
  });

  it('sets size and count correctly', async () => {
    const result = await ResourceSummary.request(artifacts, context);
    assert.equal(result.script.count, 2);
    assert.equal(result.script.transferSize, 10 + 50);
  });

  it('sets "total" resource metrics correctly', async () => {
    const result = await ResourceSummary.request(artifacts, context);
    assert.equal(result.total.count, 4);
    assert.equal(result.total.transferSize, 30 + 10 + 50 + 70);
  });

  it('sets "other" resource metrics correctly', async () => {
    artifacts = mockArtifacts([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://third-party.com/another-file.html', resourceType: 'Manifest', transferSize: 50},
    ]);
    const result = await ResourceSummary.request(artifacts, context);

    assert.equal(result.other.count, 1);
    assert.equal(result.other.transferSize, 50);
  });

  it('ignores /favicon.ico', async () => {
    artifacts = mockArtifacts([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://example.com/favicon.ico', resourceType: 'Other', transferSize: 10},
    ]);
    const result = await ResourceSummary.request(artifacts, context);

    assert.equal(result.total.count, 1);
    assert.equal(result.total.transferSize, 30);
  });

  it('ignores records with non-network protocols', async () => {
    artifacts = mockArtifacts([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'data:image/png;base64,iVBORw0KGgoAA', resourceType: 'Image', transferSize: 10,
        protocol: 'data'},
      {url: 'blob:http://www.example.com/dflskdfjlkj', resourceType: 'Other', transferSize: 99,
        protocol: 'blob'},
      {url: 'intent://example.com', resourceType: 'Other', transferSize: 1,
        protocol: 'intent'},
    ]);

    const result = await ResourceSummary.request(artifacts, context);
    assert.equal(result.total.count, 1);
    assert.equal(result.total.transferSize, 30);
  });

  describe('identifying third-party resources', () => {
    beforeEach(() => {
      artifacts = mockArtifacts([
        {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
        {url: 'http://cdn.example.com/app.js', resourceType: 'Script', transferSize: 10},
        {url: 'http://my-cdn.com/styles.css', resourceType: 'Stylesheet', transferSize: 25},
        {url: 'http://third-party.com/script.js', resourceType: 'Script', transferSize: 50},
        {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
      ]);
      context = {computedCache: new Map(), settings: {}};
    });

    describe('when firstPartyHostnames is not set', () => {
      it('the root domain and all subdomains are considered first-party', async () => {
        const result = await ResourceSummary.request(artifacts, context);
        expect(result['third-party'].transferSize).toBe(25 + 50 + 70);
        expect(result['third-party'].count).toBe(3);
      });

      it('correctly identifies root domain when second-level TLDs are used,', async () => {
        artifacts = mockArtifacts([
          {url: 'http://shopping-mall.co.uk/file.html', resourceType: 'Document', transferSize: 30},
          {url: 'http://es.shopping-mall.co.uk/file.html', resourceType: 'Script', transferSize: 7},
          {url: 'http://co.uk', resourceType: 'Script', transferSize: 10},
        ]);
        const result = await ResourceSummary.request(artifacts, context);
        expect(result['third-party'].transferSize).toBe(10);
        expect(result['third-party'].count).toBe(1);
      });
    });
  });
});
