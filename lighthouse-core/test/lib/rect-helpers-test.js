/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {
  addRectTopAndBottom,
  getRectOverlapArea,
  getLargestRect,
  getRectAtCenter,
  allRectsContainedWithinEachOther,
  getBoundingRectWithPadding,
} = require('../../lib/rect-helpers.js');

describe('Rect Helpers', () => {
  it('getRectOverlapArea', () => {
    const overlapArea = getRectOverlapArea(
      addRectTopAndBottom({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      }),
      addRectTopAndBottom({
        x: 8,
        y: 6,
        width: 10,
        height: 10,
      })
    );
    expect(overlapArea).toBe(8);
  });

  it('getLargestRect', () => {
    const rect1 = addRectTopAndBottom({
      x: 0,
      y: 0,
      width: 5,
      height: 5,
    });
    const rect2 = addRectTopAndBottom({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
    const largestRect = getLargestRect([rect1, rect2]);
    expect(largestRect).toBe(rect2);
  });

  it('getRectAtCenter', () => {
    const rect = addRectTopAndBottom({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    const largestRect = getRectAtCenter(rect, 10);
    expect(largestRect).toEqual(
      addRectTopAndBottom({
        x: 45,
        y: 45,
        width: 10,
        height: 10,
      })
    );
  });

  describe('allRectsContainedWithinEachOther', () => {
    it('Returns true if the rect lists are both empty', () => {
      expect(allRectsContainedWithinEachOther([], [])).toBe(true);
    });
    it('Returns true if rects are contained in each other', () => {
      const rect1 = addRectTopAndBottom({x: 0, y: 0, width: 100, height: 100});
      const rect2 = addRectTopAndBottom({x: 40, y: 40, width: 20, height: 20});
      expect(allRectsContainedWithinEachOther([rect1], [rect2])).toBe(true);
    });
    it('Returns true if rects aren\'t contained in each other', () => {
      const rect1 = addRectTopAndBottom({x: 0, y: 0, width: 100, height: 100});
      const rect2 = addRectTopAndBottom({x: 200, y: 200, width: 20, height: 20});
      expect(allRectsContainedWithinEachOther([rect1], [rect2])).toBe(false);
    });
  });

  describe('#getBoundingRectWithPadding', () => {
    it('throws an error if no rects are passed in', () => {
      expect(() => getBoundingRectWithPadding([])).toThrow('No rects');
    });

    it('pads rect with half minimum size on all sides', () => {
      const rect = addRectTopAndBottom({x: 0, y: 0, width: 0, height: 0});
      const minimumSize = 20;
      const expectedPaddedBounds = addRectTopAndBottom({x: -10, y: -10, width: 20, height: 20});

      expect(getBoundingRectWithPadding([rect], minimumSize)).toEqual(expectedPaddedBounds);
    });

    it('pads the bounding box of two rects with half of the minimum size', () => {
      const rect1 = addRectTopAndBottom({x: 0, y: 0, width: 10, height: 10});
      const rect2 = addRectTopAndBottom({x: 50, y: 50, width: 10, height: 10}); // in the middle somewhere
      const rect3 = addRectTopAndBottom({x: 100, y: 100, width: 10, height: 10});

      const minimumSize = 20;
      const expectedPaddedBounds = addRectTopAndBottom({
        x: -minimumSize / 2,
        y: -minimumSize / 2,
        width: 110 + minimumSize,
        height: 110 + minimumSize,
      });

      const rects = [rect1, rect2, rect3];
      expect(getBoundingRectWithPadding(rects, minimumSize)).toEqual(expectedPaddedBounds);
    });
  });
});
