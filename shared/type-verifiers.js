/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A collection of general type verification functions for dealing
 * with external data. If these grow in scope they could be auto-generated with
 * something like `io-ts`, but it's not worth the complexity yet.
 */

/**
 * Type predicate verifying `val` is an object (excluding `Array` and `null`).
 * @param {unknown} val
 * @return {val is Record<string, unknown>}
 */
function isObjectOfUnknownValues(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Type predicate verifying `val` is an object or an array.
 * @param {unknown} val
 * @return {val is Record<string, unknown>|Array<unknown>}
 */
function isObjectOrArrayOfUnknownValues(val) {
  return typeof val === 'object' && val !== null;
}

export {
  isObjectOfUnknownValues,
  isObjectOrArrayOfUnknownValues,
};
