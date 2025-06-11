/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import CacheContentGather from '../../../gather/gatherers/cache-contents.js';

let cacheContentGather;

describe('Cache Contents gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    cacheContentGather = new CacheContentGather();
  });

  it('throws an error when cache getter returns nothing', () => {
    return cacheContentGather.getArtifact({
      driver: {
        evaluateAsync() {
          return Promise.resolve();
        },
      },
    }).then(
      _ => assert.ok(false),
      _ => assert.ok(true));
  });
});
