/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {estimateCompressedContentSize, estimateTransferSize, getRequestForScript} from '../../lib/script-helpers.js';

describe('Script helpers', () => {
  describe('#estimateTransferSize', () => {
    const estimate = estimateTransferSize;

    it('should estimate by resource type compression ratio when no network info available', () => {
      assert.equal(estimate(undefined, 1000, 'Stylesheet'), 200);
      assert.equal(estimate(undefined, 1000, 'Script'), 330);
      assert.equal(estimate(undefined, 1000, 'Document'), 330);
      assert.equal(estimate(undefined, 1000, ''), 500);
    });

    it('should return transferSize when asset matches', () => {
      const resourceType = 'Stylesheet';
      const result = estimate({transferSize: 1234, resourceType}, 10000, 'Stylesheet');
      assert.equal(result, 1234);
    });

    it('should estimate by network compression ratio when asset does not match', () => {
      const resourceType = 'Other';
      const result = estimate({resourceSize: 2000, transferSize: 1000, resourceType}, 100);
      assert.equal(result, 50);
    });

    it('should not error when missing resource size', () => {
      const resourceType = 'Other';
      const result = estimate({transferSize: 1000, resourceType}, 100);
      assert.equal(result, 100);
    });

    it('should not error when resource size is 0', () => {
      const resourceType = 'Other';
      const result = estimate({transferSize: 1000, resourceSize: 0, resourceType}, 100);
      assert.equal(result, 100);
    });
  });

  describe('#estimateCompressedContentSize', () => {
    const estimate = estimateCompressedContentSize;
    const encoding = [{name: 'Content-Encoding', value: 'gzip'}];

    it('should estimate by resource type compression ratio when no network info available', () => {
      assert.equal(estimate(undefined, 1000, 'Stylesheet'), 200);
      assert.equal(estimate(undefined, 1000, 'Script'), 330);
      assert.equal(estimate(undefined, 1000, 'Document'), 330);
      assert.equal(estimate(undefined, 1000, ''), 500);
    });

    it('should return transferSize when asset matches and is encoded', () => {
      const resourceType = 'Stylesheet';
      const result = estimate(
        {transferSize: 1234, resourceType, responseHeaders: encoding},
        10000, 'Stylesheet');
      assert.equal(result, 1234);
    });

    it('should return resourceSize when asset matches and is not encoded', () => {
      const resourceType = 'Stylesheet';
      const result = estimate(
        {transferSize: 1235, resourceSize: 1234, resourceType, responseHeaders: []},
        10000, 'Stylesheet');
      assert.equal(result, 1234);
    });

    // Ex: JS script embedded in HTML response.
    it('should estimate by network compression ratio when asset does not match', () => {
      const resourceType = 'Other';
      const result = estimate(
        {resourceSize: 2000, transferSize: 1000, resourceType, responseHeaders: encoding},
        100);
      assert.equal(result, 50);
    });

    it('should not error when missing resource size', () => {
      const resourceType = 'Other';
      const result = estimate({transferSize: 1000, resourceType, responseHeaders: []}, 100);
      assert.equal(result, 100);
    });

    it('should not error when resource size is 0', () => {
      const resourceType = 'Other';
      const result = estimate(
        {transferSize: 1000, resourceSize: 0, resourceType, responseHeaders: []},
        100);
      assert.equal(result, 100);
    });
  });

  describe('#getRequestForScript', () => {
    it('should find request by url', () => {
      const networkRecords = [
        {url: 'https://example.com/script.js', requestId: '1'},
      ];
      // @ts-expect-error
      const script = {url: 'https://example.com/script.js'};
      const result = getRequestForScript(networkRecords, script);
      assert.ok(result);
      assert.equal(result.requestId, '1');
    });

    it('should follow redirect destination', () => {
      // @ts-expect-error
      const req2 = {url: 'https://example.com/script-final.js', requestId: '2'};
      // @ts-expect-error
      const req1 = {url: 'https://example.com/script.js', requestId: '1', redirectDestination: req2};
      const networkRecords = [req1, req2];
      // @ts-expect-error
      const script = {url: 'https://example.com/script.js'};
      const result = getRequestForScript(networkRecords, script);
      assert.ok(result);
      assert.equal(result.requestId, '2');
    });

    it('should match by frameId when multiple requests for the same URL exist', () => {
      const mainFrameRequest = {
        url: 'https://example.com/script.js',
        requestId: '1',
        frameId: 'MAIN_FRAME',
        transferSize: 341000,
      };
      const iframeRequest = {
        url: 'https://example.com/script.js',
        requestId: '2',
        frameId: 'IFRAME',
        transferSize: 0,
        fromDiskCache: true,
      };
      // @ts-expect-error
      const networkRecords = [mainFrameRequest, iframeRequest];

      const script1 = {
        url: 'https://example.com/script.js',
        executionContextAuxData: {frameId: 'MAIN_FRAME'},
      };
      const script2 = {
        url: 'https://example.com/script.js',
        executionContextAuxData: {frameId: 'IFRAME'},
      };

      // @ts-expect-error
      const result1 = getRequestForScript(networkRecords, script1);
      assert.ok(result1);
      assert.equal(result1.requestId, '1');

      // @ts-expect-error
      const result2 = getRequestForScript(networkRecords, script2);
      assert.ok(result2);
      assert.equal(result2.requestId, '2');
    });

    it('should fallback to URL match if no frameId matches', () => {
      const req = {
        url: 'https://example.com/script.js',
        requestId: '1',
        frameId: 'SOME_FRAME',
      };
      // @ts-expect-error
      const networkRecords = [req];
      const script = {
        url: 'https://example.com/script.js',
        executionContextAuxData: {frameId: 'DIFFERENT_FRAME'},
      };
      // @ts-expect-error
      const result = getRequestForScript(networkRecords, script);
      assert.ok(result);
      assert.equal(result.requestId, '1');
    });
  });
});
