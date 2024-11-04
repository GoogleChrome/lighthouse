/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {isEqual} from 'lodash-es';

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
   * @param {function(*,*):boolean} equalsFn
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
   * Determines whether two objects are deeply equal. Defers to lodash isEqual, but is kept here for
   * easy usage by consumers.
   * See https://lodash.com/docs/4.17.5#isEqual.
   * @param {*} objA
   * @param {*} objB
   * @return {boolean}
   */
  static deepEquals(objA, objB) {
    return isEqual(objA, objB);
  }
}

export {ArbitraryEqualityMap};
