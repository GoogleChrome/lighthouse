/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {ArbitraryEqualityMap} from '../../lib/arbitrary-equality-map.js';
import {readJson} from '../test-utils.js';

const trace = readJson('../fixtures/artifacts/progressive-app/trace.json', import.meta);

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
