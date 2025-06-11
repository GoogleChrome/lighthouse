/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import fs from 'fs';

import jsdom from 'jsdom';

import {TreemapUtil} from '../app/src/util.js';
import {LH_ROOT} from '../../shared/root.js';

describe('TreemapUtil', () => {
  it('pathsAreEqual works', () => {
    // Paths are equal.
    expect(TreemapUtil.pathsAreEqual([], [])).toBe(true);
    expect(TreemapUtil.pathsAreEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    // Paths are not equal.
    expect(TreemapUtil.pathsAreEqual(['b', 'a', 'c'], ['a', 'b', 'c'])).toBe(false);
    expect(TreemapUtil.pathsAreEqual(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
    expect(TreemapUtil.pathsAreEqual(['a', 'b', 'c'], ['a', 'b'])).toBe(false);
  });

  it('pathIsSubpath works', () => {
    // Subpath matches.
    expect(TreemapUtil.pathIsSubpath([], [])).toBe(true);
    expect(TreemapUtil.pathIsSubpath([], ['a', 'b', 'c'])).toBe(true);
    expect(TreemapUtil.pathIsSubpath(['a'], ['a', 'b', 'c'])).toBe(true);
    expect(TreemapUtil.pathIsSubpath(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(TreemapUtil.pathIsSubpath(['a', 'b'], ['a', 'b', 'c'])).toBe(true);
    // Subpath mostly matches, but is longer than the path.
    expect(TreemapUtil.pathIsSubpath(['a', 'b', 'c'], ['a', 'b'])).toBe(false);
    // Subpath does not match.
    expect(TreemapUtil.pathIsSubpath(['b', 'a'], ['a', 'b', 'c'])).toBe(false);
  });

  it('stableHasher works', () => {
    const values = [1, 2, 3, 4, 5];
    let hasher = TreemapUtil.stableHasher([1, 2, 3, 4, 5]);
    const expectedValues = [
      hasher('value0'),
      hasher('value1'),
      hasher('value2'),
      hasher('value3'),
      hasher('value4'),
      hasher('value5'),
    ];

    for (const expectedValue of expectedValues) {
      expect(values).toContain(expectedValue);
    }

    // Expect the same values using the same invocation.
    expect(hasher('value0')).toBe(expectedValues[0]);
    expect(hasher('value1')).toBe(expectedValues[1]);
    expect(hasher('value2')).toBe(expectedValues[2]);
    expect(hasher('value3')).toBe(expectedValues[3]);
    expect(hasher('value4')).toBe(expectedValues[4]);
    expect(hasher('value5')).toBe(expectedValues[5]);

    // Repeat, expecting the same values.
    hasher = TreemapUtil.stableHasher([1, 2, 3, 4, 5]);
    expect(hasher('value0')).toBe(expectedValues[0]);
    expect(hasher('value1')).toBe(expectedValues[1]);
    expect(hasher('value2')).toBe(expectedValues[2]);
    expect(hasher('value3')).toBe(expectedValues[3]);
    expect(hasher('value4')).toBe(expectedValues[4]);
    expect(hasher('value5')).toBe(expectedValues[5]);

    // Expect values array is not modified.
    expect(values).toEqual([1, 2, 3, 4, 5]);
  });

  describe('data-i18n', () => {
    it('should have only valid data-i18n values in treemap html', () => {
      const TREEMAP_INDEX = fs.readFileSync(LH_ROOT + '/treemap/app/index.html', 'utf8');
      const dom = new jsdom.JSDOM(TREEMAP_INDEX);
      for (const node of dom.window.document.querySelectorAll('[data-i18n]')) {
        const val = node.getAttribute('data-i18n');
        assert.ok(val in TreemapUtil.UIStrings, `Invalid data-i18n value of: "${val}" not found.`);
      }
    });
  });
});
