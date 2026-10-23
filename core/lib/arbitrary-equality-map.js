/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {*} a
 * @param {*} b
 * @param {WeakMap<object, WeakSet<object>>=} seen
 * @return {boolean}
 */
function deepEquals(a, b, seen) {
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  if (a.constructor !== b.constructor) return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime() || (Number.isNaN(a.getTime()) && Number.isNaN(b.getTime()));
  }
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    if (a.byteLength !== b.byteLength) return false;
    const viewA = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    const viewB = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) return false;
    }
    return true;
  }
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    if (a.byteLength !== b.byteLength) return false;
    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) return false;
    }
    return true;
  }

  if (!seen) {
    seen = new WeakMap();
  }
  let seenB = seen.get(a);
  if (seenB) {
    if (seenB.has(b)) return true;
  } else {
    seenB = new WeakSet();
    seen.set(a, seenB);
  }
  seenB.add(b);

  if (Array.isArray(a)) {
    const arrB = /** @type {unknown[]} */ (b);
    if (a.length !== arrB.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], arrB[i], seen)) return false;
    }
    return true;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !deepEquals(v, b.get(k), seen)) return false;
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    /** @type {unknown[]} */
    const unmatchedA = [];
    for (const v of a) {
      if (!b.has(v)) {
        if (typeof v !== 'object' || v === null) return false;
        unmatchedA.push(v);
      }
    }
    if (unmatchedA.length === 0) return true;
    /** @type {unknown[]} */
    const unmatchedB = [];
    for (const v of b) {
      if (!a.has(v)) {
        if (typeof v !== 'object' || v === null) return false;
        unmatchedB.push(v);
      }
    }
    if (unmatchedA.length !== unmatchedB.length) return false;
    for (const itemA of unmatchedA) {
      const matchIndex = unmatchedB.findIndex(itemB => deepEquals(itemA, itemB, seen));
      if (matchIndex === -1) return false;
      unmatchedB.splice(matchIndex, 1);
    }
    return true;
  }

  if (a instanceof Error && b instanceof Error) {
    if (a.name !== b.name || a.message !== b.message || !deepEquals(a.cause, b.cause, seen)) {
      return false;
    }
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.hasOwn(b, key) || !deepEquals(a[key], b[key], seen)) return false;
  }
  return true;
}

/**
 * @fileoverview This class is designed to allow maps with arbitrary equality functions.
 * It is not meant to be performant and is well-suited to use cases where the number of entries is
 * likely to be small (like computed artifacts).
 */
class ArbitraryEqualityMap {
  constructor() {
    this._equalsFn = ArbitraryEqualityMap.deepEquals;
    /** @type {Array<{key: *, value: *}>} */
    this._entries = [];
  }

  /**
   * @param {(a: any, b: any) => boolean} equalsFn
   */
  setEqualityFn(equalsFn) {
    this._equalsFn = equalsFn;
  }

  /**
   * @param {*} key
   * @return {boolean}
   */
  has(key) {
    return this._findIndexOf(key) !== -1;
  }

  /**
   * @param {*} key
   * @return {*}
   */
  get(key) {
    const entry = this._entries[this._findIndexOf(key)];
    return entry?.value;
  }

  /**
   * @param {*} key
   * @param {*} value
   */
  set(key, value) {
    let index = this._findIndexOf(key);
    if (index === -1) index = this._entries.length;
    this._entries[index] = {key, value};
  }

  /**
   * @param {*} key
   * @return {number}
   */
  _findIndexOf(key) {
    for (let i = 0; i < this._entries.length; i++) {
      if (this._equalsFn(key, this._entries[i].key)) return i;
    }

    return -1;
  }

  /**
   * Determines whether two objects are deeply equal.
   * @param {*} objA
   * @param {*} objB
   * @return {boolean}
   */
  static deepEquals(objA, objB) {
    return deepEquals(objA, objB);
  }
}

export {ArbitraryEqualityMap, deepEquals as isEqual};
