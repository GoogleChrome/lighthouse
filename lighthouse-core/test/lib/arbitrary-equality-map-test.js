/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const ArbitraryEqualityMap = require('../../lib/arbitrary-equality-map.js');
const trace = require('../fixtures/traces/progressive-app-m60.json');

describe('ArbitraryEqualityMap', () => {
  it('creates a map', () => {
    const map = new ArbitraryEqualityMap();
    assert.equal(map.has(1), false);
    assert.equal(map.get(1), undefined);
    map.set(1, 2);
    assert.equal(map.has(1), true);
    assert.equal(map.get(1), 2);
  });

  it('uses custom equality function', () => {
    // create a map which stores 1 value per type
    const map = new ArbitraryEqualityMap();
    map.setEqualityFn((a, b) => typeof a === typeof b);
    map.set(true, 1);
    map.set('foo', 2);
    map.set({}, 3);
    map.set('bar', 4);

    assert.equal(map.has(1), false);
    assert.equal(map.has(false), true);
    assert.equal(map.has(''), true);
    assert.equal(map.has({x: 1}), true);
    assert.equal(map.get('foo'), 4);
  });

  it('is not hella slow', () => {
    const map = new ArbitraryEqualityMap();
    map.setEqualityFn(ArbitraryEqualityMap.deepEquals);
    for (let i = 0; i < 100; i++) {
      map.set({i}, i);
    }

    for (let j = 0; j < 1000; j++) {
      const i = j % 100;
      assert.equal(map.get({i}), i);
    }
  }, 1000);

  it('is fast for expected usage', () => {
    const map = new ArbitraryEqualityMap();
    map.setEqualityFn(ArbitraryEqualityMap.deepEquals);
    map.set([trace, {x: 0}], 'foo');
    map.set([trace, {x: 1}], 'bar');

    for (let i = 0; i < 10000; i++) {
      assert.equal(map.get([trace, {x: i % 2}]), i % 2 ? 'bar' : 'foo');
    }
  }, 1000);
});
