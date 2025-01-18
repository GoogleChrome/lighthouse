/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {estimateCompressedContentSize, estimateTransferSize} from '../../lib/script-helpers.js';

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
});
