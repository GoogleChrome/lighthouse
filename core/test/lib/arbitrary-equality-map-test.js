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

  it('deepEquals compares various types accurately', () => {
    const {deepEquals} = ArbitraryEqualityMap;
    assert.equal(deepEquals(1, 1), true);
    assert.equal(deepEquals(NaN, NaN), true);
    assert.equal(deepEquals(1, '1'), false);
    assert.equal(deepEquals(null, undefined), false);
    assert.equal(deepEquals({a: 1, b: [2, 3]}, {b: [2, 3], a: 1}), true);
    assert.equal(deepEquals({a: 1}, {a: 1, b: undefined}), false);
    assert.equal(deepEquals(new Date(1000), new Date(1000)), true);
    assert.equal(deepEquals(new Date(1000), new Date(2000)), false);
    assert.equal(deepEquals(/abc/gi, /abc/gi), true);
    assert.equal(deepEquals(/abc/g, /abc/i), false);
    assert.equal(deepEquals(new Uint8Array([1, 2]), new Uint8Array([1, 2])), true);
    assert.equal(deepEquals(new Uint8Array([1, 2]), new Uint8Array([1, 3])), false);
    assert.equal(deepEquals(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 2]).buffer), true);
    assert.equal(deepEquals(new Uint8Array([1, 2]).buffer, new Uint8Array([1, 3]).buffer), false);
    assert.equal(deepEquals(new ArrayBuffer(2), new ArrayBuffer(4)), false);
    assert.equal(deepEquals(new Set([1, 2]), new Set([1, 2])), true);
    assert.equal(deepEquals(new Set([1, 2]), new Set([1, 3])), false);
    assert.equal(deepEquals(new Set([{x: 1}, {y: 2}]), new Set([{y: 2}, {x: 1}])), true);
    assert.equal(deepEquals(new Set([{x: 1}, {x: 1}]), new Set([{x: 1}, {x: 2}])), false);
    assert.equal(deepEquals(new Map([['a', {x: 1}]]), new Map([['a', {x: 1}]])), true);
    assert.equal(deepEquals(new Map([['a', {x: 1}]]), new Map([['a', {x: 2}]])), false);
    assert.equal(deepEquals(new Error('a'), new Error('a')), true);
    assert.equal(deepEquals(new Error('a'), new Error('b')), false);
    assert.equal(deepEquals(new Error('a'), new TypeError('a')), false);
    assert.equal(
      deepEquals(new Error('a', {cause: {x: 1}}), new Error('a', {cause: {x: 1}})),
      true
    );
    assert.equal(
      deepEquals(new Error('a', {cause: {x: 1}}), new Error('a', {cause: {x: 2}})),
      false
    );

    const cyclicA = {name: 'a'};
    cyclicA.self = cyclicA;
    const cyclicB = {name: 'a'};
    cyclicB.self = cyclicB;
    assert.equal(deepEquals(cyclicA, cyclicB), true);

    const multiCyclicA = {};
    multiCyclicA.x = multiCyclicA;
    multiCyclicA.y = multiCyclicA;
    const multiCyclicB1 = {};
    const multiCyclicB2 = {};
    multiCyclicB1.x = multiCyclicB2;
    multiCyclicB1.y = multiCyclicB1;
    multiCyclicB2.x = multiCyclicB1;
    multiCyclicB2.y = multiCyclicB2;
    assert.equal(deepEquals(multiCyclicA, multiCyclicB1), true);
    multiCyclicB2.y = {x: multiCyclicB1, y: {}};
    assert.equal(deepEquals(multiCyclicA, multiCyclicB1), false);
  });
});
