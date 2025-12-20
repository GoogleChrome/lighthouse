/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;

const makeComputedArtifact = require('../../computed/computed-artifact.js');

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

    const TestComputedArtifact = makeComputedArtifact(RawTestComputedArtifact);
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
});
