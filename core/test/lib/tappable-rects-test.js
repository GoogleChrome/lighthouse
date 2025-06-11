/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {addRectTopAndBottom} from '../../lib/rect-helpers.js';
import {getTappableRectsFromClientRects} from '../../lib/tappable-rects.js';

describe('getTappableRectsFromClientRects', () => {
  it('Merges rects if a smaller rect is inside a larger one', () => {
    const containingRect = addRectTopAndBottom({
      x: 10,
      y: 10,
      width: 100,
      height: 10,
    });
    const containedRect = addRectTopAndBottom({
      x: 10,
      y: 10,
      width: 50,
      height: 10,
    });

    assert.deepEqual(getTappableRectsFromClientRects([
      containingRect,
      containedRect,
    ]), [containingRect]);
    assert.deepEqual(getTappableRectsFromClientRects([
      containedRect,
      containingRect,
    ]), [containingRect]);
  });
  it('Merges two horizontally adjacent client rects', () => {
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 100,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 110,
        y: 10,
        width: 100,
        height: 10,
      }),
    ]);
    assert.deepEqual(res, [
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 200,
        height: 10,
      }),
    ]);
  });

  it('Merges three horizontally adjacent client rects', () => {
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 100,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 110,
        y: 10,
        width: 100,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 210,
        y: 10,
        width: 100,
        height: 10,
      }),
    ]);
    assert.deepEqual(res, [
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 300,
        height: 10,
      }),
    ]);
  });

  it('Merges client rects correctly if one is duplicated', () => {
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 90,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 90,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 100,
        y: 10,
        width: 10,
        height: 10,
      }),
    ]);
    assert.deepEqual(res, [
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 100,
        height: 10,
      }),
    ]);
  });

  it('Merges two vertically adjacent client rects even if one is wider than the other', () => {
    // We do this because to fix issues with children (e.g. images) inside links.
    // The link itself might be small, so if we put a finger on it directly then it's
    // likely to overlap with something.
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 100,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 10,
        y: 15,
        width: 200,
        height: 15,
      }),
    ]);
    assert.deepEqual(res, [
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 200,
        height: 20,
      }),
    ]);
  });

  it('Does not merge if the center of the merged rect wouldn\'t be in the original rects', () => {
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 10,
        height: 100,
      }),
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 200,
        height: 10,
      }),
    ]);
    assert.equal(res.length, 2);
  });

  it('Merges two horizontally adjacent client rects that don\'t line up exactly', () => {
    // 2px difference is ok, often there are cases where an image is a 1px or 2px out of the main link client rect
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 100,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 110,
        y: 12,
        width: 100,
        height: 10,
      }),
    ]);
    assert.deepEqual(res, [
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 200,
        height: 12,
      }),
    ]);
  });

  it('Merges two identical client rects into one', () => {
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 10,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 10,
        height: 10,
      }),
    ]);
    assert.deepEqual(res, [
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 10,
        height: 10,
      }),
    ]);
  });

  it('Removes tiny 1x1px client rects', () => {
    const res = getTappableRectsFromClientRects([
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 100,
        height: 100,
      }),
      addRectTopAndBottom({
        x: 5,
        y: 5,
        width: 1,
        height: 1,
      }),
    ]);
    assert.deepEqual(res, [
      addRectTopAndBottom({
        x: 10,
        y: 10,
        width: 100,
        height: 100,
      }),
    ]);
  });
});
