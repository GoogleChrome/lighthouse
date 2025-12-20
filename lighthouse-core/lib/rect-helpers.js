/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {LH.Artifacts.Rect} rect
 * @param {{x:number, y:number}} point
 */
function rectContainsPoint(rect, {x, y}) {
  return rect.left <= x && rect.right >= x && rect.top <= y && rect.bottom >= y;
}

/**
 * Returns whether rect2 is contained entirely within rect1;
 * @param {LH.Artifacts.Rect} rect1
 * @param {LH.Artifacts.Rect} rect2
 * @return {boolean}
 */
// We sometimes run this as a part of a gatherer script injected into the page, so prevent
// renaming the function for code coverage.
/* istanbul ignore next */
function rectContains(rect1, rect2) {
  return rect2.top >= rect1.top &&
    rect2.right <= rect1.right &&
    rect2.bottom <= rect1.bottom &&
    rect2.left >= rect1.left;
}

/**
 * @param {LH.Artifacts.Rect[]} rects
 * @returns {LH.Artifacts.Rect[]}
 */
function filterOutTinyRects(rects) {
  return rects.filter(
    rect => rect.width > 1 && rect.height > 1
  );
}

/**
 * @param {LH.Artifacts.Rect[]} rects
 * @returns {LH.Artifacts.Rect[]}
 */
function filterOutRectsContainedByOthers(rects) {
  const rectsToKeep = new Set(rects);

  for (const rect of rects) {
    for (const possiblyContainingRect of rects) {
      if (rect === possiblyContainingRect) continue;
      if (!rectsToKeep.has(possiblyContainingRect)) continue;
      if (rectContains(possiblyContainingRect, rect)) {
        rectsToKeep.delete(rect);
        break;
      }
    }
  }

  return Array.from(rectsToKeep);
}

/**
 * @param {LH.Artifacts.Rect} rect
 */
/* istanbul ignore next */
function getRectCenterPoint(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * @param {LH.Artifacts.Rect} rectA
 * @param {LH.Artifacts.Rect} rectB
 * @returns {boolean}
 */
function rectsTouchOrOverlap(rectA, rectB) {
  // https://stackoverflow.com/questions/2752349/fast-rectangle-to-rectangle-intersection
  return (
    rectA.left <= rectB.right &&
    rectB.left <= rectA.right &&
    rectA.top <= rectB.bottom &&
    rectB.top <= rectA.bottom
  );
}

/**
 * Returns a bounding rect for all the passed in rects, with padded with half of
 * `padding` on all sides.
 * @param {LH.Artifacts.Rect[]} rects
 * @param {number} padding
 * @return {LH.Artifacts.Rect}
 */
function getBoundingRectWithPadding(rects, padding) {
  if (rects.length === 0) {
    throw new Error('No rects to take bounds of');
  }

  let left = Number.MAX_VALUE;
  let right = -Number.MAX_VALUE;
  let top = Number.MAX_VALUE;
  let bottom = -Number.MAX_VALUE;
  for (const rect of rects) {
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
  }

  // Pad on all sides.
  const halfMinSize = padding / 2;
  left -= halfMinSize;
  right += halfMinSize;
  top -= halfMinSize;
  bottom += halfMinSize;

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * @param {LH.Artifacts.Rect[]} rects
 */
function getBoundingRect(rects) {
  return getBoundingRectWithPadding(rects, 0);
}

/**
 * @param {{left:number, top:number, right:number, bottom: number}} rect
 * @return {LH.Artifacts.Rect}
 */
function addRectWidthAndHeight({left, top, right, bottom}) {
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * @param {{x:number, y:number, width:number, height: number}} rect
 * @return {LH.Artifacts.Rect}
 */
function addRectTopAndBottom({x, y, width, height}) {
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
  };
}

/**
 * @param {LH.Artifacts.Rect} rect1
 * @param {LH.Artifacts.Rect} rect2
 */
function getRectOverlapArea(rect1, rect2) {
  // https://stackoverflow.com/a/9325084/1290545
  const rectYOverlap = Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top);
  if (rectYOverlap <= 0) return 0;

  const rectXOverlap = Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left);
  if (rectXOverlap <= 0) return 0;

  return rectXOverlap * rectYOverlap;
}

/**
 * @param {LH.Artifacts.Rect} rect
 * @param {number} centerRectSize
 */
function getRectAtCenter(rect, centerRectSize) {
  return addRectWidthAndHeight({
    left: rect.left + rect.width / 2 - centerRectSize / 2,
    top: rect.top + rect.height / 2 - centerRectSize / 2,
    right: rect.right - rect.width / 2 + centerRectSize / 2,
    bottom: rect.bottom - rect.height / 2 + centerRectSize / 2,
  });
}

/**
 * @param {LH.Artifacts.Rect} rect
 */
/* istanbul ignore next */
function getRectArea(rect) {
  return rect.width * rect.height;
}

/**
 * @param {LH.Artifacts.Rect[]} rects
 */
/* istanbul ignore next */
function getLargestRect(rects) {
  let largestRect = rects[0];
  for (const rect of rects) {
    if (getRectArea(rect) > getRectArea(largestRect)) {
      largestRect = rect;
    }
  }
  return largestRect;
}

/**
 *
 * @param {LH.Artifacts.Rect[]} rectListA
 * @param {LH.Artifacts.Rect[]} rectListB
 */
function allRectsContainedWithinEachOther(rectListA, rectListB) {
  for (const rectA of rectListA) {
    for (const rectB of rectListB) {
      if (!rectContains(rectA, rectB) && !rectContains(rectB, rectA)) {
        return false;
      }
    }
  }
  return true;
}

module.exports = {
  rectContainsPoint,
  rectContains,
  addRectWidthAndHeight,
  addRectTopAndBottom,
  getRectOverlapArea,
  getRectAtCenter,
  getLargestRect,
  getRectArea,
  getRectCenterPoint,
  getBoundingRect,
  getBoundingRectWithPadding,
  rectsTouchOrOverlap,
  allRectsContainedWithinEachOther,
  filterOutRectsContainedByOthers,
  filterOutTinyRects,
};
