/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {makeComputedArtifact} from '../../computed/computed-artifact.js';

describe('ComputedArtifact base class', () => {
  it('caches computed artifacts by strict equality', async () => {
    let computeCounter = 0;
    class RawTestComputedArtifact {
      static async compute_() {
        return computeCounter++;
      }
    }

    const context = {
      computedCache: new Map(),
    };

    const TestComputedArtifact = makeComputedArtifact(RawTestComputedArtifact, null);
    let result = await TestComputedArtifact.request({x: 1}, context);
    assert.equal(result, 0);

    result = await TestComputedArtifact.request({x: 2}, context);
    assert.equal(result, 1);

    result = await TestComputedArtifact.request({x: 1}, context);
    assert.equal(result, 0);

    result = await TestComputedArtifact.request({x: 2}, context);
    assert.equal(result, 1);
    assert.equal(computeCounter, 2);
  });

  it('caches by strict equality on key list if provided', async () => {
    const keys = ['x'];
    let computeCounter = 0;
    class RawTestComputedArtifact {
      static async compute_(dependencies) {
        assert.deepEqual(Object.keys(dependencies), keys);
        return computeCounter++;
      }
    }

    const context = {
      computedCache: new Map(),
    };

    const TestComputedArtifact = makeComputedArtifact(RawTestComputedArtifact, keys);
    let result = await TestComputedArtifact.request({x: 1, y: 100}, context);
    assert.equal(result, 0);

    result = await TestComputedArtifact.request({x: 2, test: 'me'}, context);
    assert.equal(result, 1);

    result = await TestComputedArtifact.request({x: 1}, context);
    assert.equal(result, 0);

    result = await TestComputedArtifact.request({x: 2, light: 'house'}, context);
    assert.equal(result, 1);
    assert.equal(computeCounter, 2);
  });
});
