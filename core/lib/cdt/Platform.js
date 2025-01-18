// @ts-nocheck
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Functions manually copied from:
// https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/platform/array-utilities.ts#L125

/**
 * @param {any[]} array
 * @param {any} needle
 * @param {any} comparator
 */
function lowerBound(array, needle, comparator, left, right) {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(needle, array[m]) > 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}

/**
 * @param {any[]} array
 * @param {any} needle
 * @param {any} comparator
 */
function upperBound(array, needle, comparator, left, right) {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(needle, array[m]) >= 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}

module.exports = {
  ArrayUtilities: {
    lowerBound,
    upperBound,
  },
  DevToolsPath: {
    EmptyUrlString: '',
  },
};
