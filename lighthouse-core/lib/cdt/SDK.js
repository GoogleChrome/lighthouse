/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const SDK = {
  TextSourceMap: require('./generated/SourceMap.js'),
};

/**
 * CDT pollutes Array.prototype w/ `lowerBound/upperBound`. SourceMap
 * relies on this, but only for a couple method return values. To avoid global pollution,
 * we explicitly set the extension functions on the return values.
 *
 * @param {unknown[]} array
 */
function extendArray(array) {
  // @ts-ignore
  if (array.lowerBound) return;

  // @ts-ignore
  array.lowerBound = lowerBound.bind(array);
  // @ts-ignore
  array.upperBound = upperBound.bind(array);
  // @ts-ignore
  array.slice = function(start, end) {
    const retVal = Array.prototype.slice.call(array, start, end);
    extendArray(retVal);
    return retVal;
  };
  // @ts-ignore
  array.filter = function(fn) {
    const retVal = Array.prototype.filter.call(array, fn);
    extendArray(retVal);
    return retVal;
  };
}

const originalMappings = SDK.TextSourceMap.prototype.mappings;
SDK.TextSourceMap.prototype.mappings = function() {
  const mappings = originalMappings.call(this);
  extendArray(mappings);
  return mappings;
};

const originalReversedMappings = SDK.TextSourceMap.prototype._reversedMappings;
SDK.TextSourceMap.prototype._reversedMappings = function(sourceURL) {
  const mappings = originalReversedMappings.call(this, sourceURL);
  extendArray(mappings);
  return mappings;
};

/**
 * `upperBound` and `lowerBound` are copied from CDT utilities.js.
 * These are the only methods needed from that file.
 */

/**
 * Return index of the leftmost element that is greater
 * than the specimen object. If there's no such element (i.e. all
 * elements are smaller or equal to the specimen) returns right bound.
 * The function works for sorted array.
 * When specified, |left| (inclusive) and |right| (exclusive) indices
 * define the search window.
 *
 * @param {!T} object
 * @param {function(!T,!S):number=} comparator
 * @param {number=} left
 * @param {number=} right
 * @return {number}
 * @this {Array.<!S>}
 * @template T,S
 */
function upperBound(object, comparator, left, right) {
  // @ts-ignore
  function defaultComparator(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  comparator = comparator || defaultComparator;
  let l = left || 0;
  let r = right !== undefined ? right : this.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(object, this[m]) >= 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}

/**
 * Return index of the leftmost element that is equal or greater
 * than the specimen object. If there's no such element (i.e. all
 * elements are smaller than the specimen) returns right bound.
 * The function works for sorted array.
 * When specified, |left| (inclusive) and |right| (exclusive) indices
 * define the search window.
 *
 * @param {!T} object
 * @param {function(!T,!S):number=} comparator
 * @param {number=} left
 * @param {number=} right
 * @return {number}
 * @this {Array.<!S>}
 * @template T,S
 */
function lowerBound(object, comparator, left, right) {
  // @ts-ignore
  function defaultComparator(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  comparator = comparator || defaultComparator;
  let l = left || 0;
  let r = right !== undefined ? right : this.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(object, this[m]) > 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}

// Add `lastColumnNumber` to mappings. This will eventually be added to CDT.
// @ts-ignore
SDK.TextSourceMap.prototype.computeLastGeneratedColumns = function() {
  const mappings = this.mappings();
  // @ts-ignore: `lastColumnNumber` is not on types yet.
  if (mappings.length && typeof mappings[0].lastColumnNumber !== 'undefined') return;

  for (let i = 0; i < mappings.length - 1; i++) {
    const mapping = mappings[i];
    const nextMapping = mappings[i + 1];
    if (mapping.lineNumber === nextMapping.lineNumber) {
      // @ts-ignore: `lastColumnNumber` is not on types yet.
      mapping.lastColumnNumber = nextMapping.columnNumber;
    }
  }
};

module.exports = SDK;
