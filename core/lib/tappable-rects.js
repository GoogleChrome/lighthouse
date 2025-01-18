/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as RectHelpers from './rect-helpers.js';

/**
 * Merge client rects together and remove small ones. This may result in a larger overall
 * size than that of the individual client rects.
 * We use this to simulate a finger tap on those targets later on.
 * @param {LH.Artifacts.Rect[]} clientRects
 */
function getTappableRectsFromClientRects(clientRects) {
  // 1x1px rect shouldn't be reason to treat the rect as something the user should tap on.
  // Often they're made invisble in some obscure way anyway, and only exist for e.g. accessibiliity.
  clientRects = RectHelpers.filterOutTinyRects(clientRects);
  clientRects = RectHelpers.filterOutRectsContainedByOthers(clientRects);
  clientRects = mergeTouchingClientRects(clientRects);
  return clientRects;
}

/**
 * Sometimes a child will reach out of the parent by a few px, but still
 * clearly belong to the same tap area in the users's eyes.
 * We can be quite generous here, since merging too much tends to cause false
 * passes instead of false failures (because there are more fingers)
 * @param {number} a
 * @param {number} b
 */
function almostEqual(a, b) {
  return Math.abs(a - b) <= 10;
}

/**
 * Merge touching rects based on what appears as one tappable area to the user.
 * @param {LH.Artifacts.Rect[]} clientRects
 * @return {LH.Artifacts.Rect[]}
 */
function mergeTouchingClientRects(clientRects) {
  for (let i = 0; i < clientRects.length; i++) {
    for (let j = i + 1; j < clientRects.length; j++) {
      const crA = clientRects[i];
      const crB = clientRects[j];

      /**
       * We try to determine whether the rects appear as a single tappable
       * area to the user, so that they'd tap in the middle of the merged rect.
       * Examples of what we want to merge:
       *
       * AAABBB
       *
       * AAA
       * AAA
       * BBBBB
       */
      const rectsLineUpHorizontally =
        almostEqual(crA.top, crB.top) || almostEqual(crA.bottom, crB.bottom);
      const rectsLineUpVertically =
        almostEqual(crA.left, crB.left) || almostEqual(crA.right, crB.right);
      const canMerge =
        RectHelpers.rectsTouchOrOverlap(crA, crB) &&
        (rectsLineUpHorizontally || rectsLineUpVertically);

      if (canMerge) {
        const replacementClientRect = RectHelpers.getBoundingRect([crA, crB]);
        const mergedRectCenter = RectHelpers.getRectCenterPoint(replacementClientRect);

        if (
          !(
            RectHelpers.rectContainsPoint(crA, mergedRectCenter) ||
            RectHelpers.rectContainsPoint(crB, mergedRectCenter)
          )
        ) {
          // Don't merge because the new shape is too different from the
          // merged rects, and tapping in the middle wouldn't actually hit
          // either rect
          continue;
        }

        // Replace client rects with merged version
        clientRects = clientRects.filter(cr => cr !== crA && cr !== crB);
        clientRects.push(replacementClientRect);

        // Start over so we don't have to handle complexity introduced by array mutation.
        // Client rect ararys rarely contain more than 5 rects, so starting again doesn't cause perf issues.
        return mergeTouchingClientRects(clientRects);
      }
    }
  }

  return clientRects;
}

export {
  getTappableRectsFromClientRects,
};
