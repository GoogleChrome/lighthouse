/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Checks that links, buttons, etc. are sufficiently large and that there's
 * no other tap target that's too close so that the user might accidentally tap on.
 */
const Audit = require('../audit.js');
const ComputedViewportMeta = require('../../computed/viewport-meta.js');
const {
  rectsTouchOrOverlap,
  getRectOverlapArea,
  getRectAtCenter,
  allRectsContainedWithinEachOther,
  getLargestRect,
  getBoundingRectWithPadding,
} = require('../../lib/rect-helpers.js');
const {getTappableRectsFromClientRects} = require('../../lib/tappable-rects.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on whether tap targets (like buttons and links) on a page are big enough so they can easily be tapped on a mobile device. This descriptive title is shown when tap targets are easy to tap on. */
  title: 'Tap targets are sized appropriately',
  /** Descriptive title of a Lighthouse audit that provides detail on whether tap targets (like buttons and links) on a page are big enough so they can easily be tapped on a mobile device. This descriptive title is shown when tap targets are not easy to tap on. */
  failureTitle: 'Tap targets are not sized appropriately',
  /** Description of a Lighthouse audit that tells the user why buttons and links need to be big enough and what 'big enough' means. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Interactive elements like buttons and links should be large enough (48x48px), and have enough space around them, to be easy enough to tap without overlapping onto other elements. [Learn more](https://web.dev/tap-targets).',
  /** Label of a table column that identifies tap targets (like buttons and links) that have failed the audit and aren't easy to tap on. */
  tapTargetHeader: 'Tap Target',
  /** Label of a table column that identifies a tap target (like a link or button) that overlaps with another tap target. */
  overlappingTargetHeader: 'Overlapping Target',
  /** Explanatory message stating that there was a failure in an audit caused by the viewport meta tag not being optimized for mobile screens, which caused tap targets like buttons and links to be too small to tap on. */
  /* eslint-disable-next-line max-len */
  explanationViewportMetaNotOptimized: 'Tap targets are too small because there\'s no viewport meta tag optimized for mobile screens',
  /** Explanatory message stating that a certain percentage of the tap targets (like buttons and links) on the page are of an appropriately large size. */
  displayValue: '{decimalProportion, number, percent} appropriately sized tap targets',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const FINGER_SIZE_PX = 48;
// Ratio of the finger area tapping on an unintended element
// to the finger area tapping on the intended element
const MAX_ACCEPTABLE_OVERLAP_SCORE_RATIO = 0.25;

/**
 * Returns a tap target augmented with a bounding rect for quick overlapping
 * rejections. Rect contains all the client rects, padded to half FINGER_SIZE_PX.
 * @param {LH.Artifacts.TapTarget[]} targets
 * @return {BoundedTapTarget[]}
 */
function getBoundedTapTargets(targets) {
  return targets.map(tapTarget => {
    return {
      tapTarget,
      paddedBoundsRect: getBoundingRectWithPadding(tapTarget.clientRects, FINGER_SIZE_PX),
    };
  });
}

/**
 * @param {LH.Artifacts.Rect} cr
 */
function clientRectBelowMinimumSize(cr) {
  return cr.width < FINGER_SIZE_PX || cr.height < FINGER_SIZE_PX;
}

/**
 * A target is "too small" if none of its clientRects are at least the size of a finger.
 * @param {BoundedTapTarget[]} targets
 * @returns {BoundedTapTarget[]}
 */
function getTooSmallTargets(targets) {
  return targets.filter(target => {
    return target.tapTarget.clientRects.every(clientRectBelowMinimumSize);
  });
}

/**
 * @param {BoundedTapTarget[]} tooSmallTargets
 * @param {BoundedTapTarget[]} allTargets
 * @returns {TapTargetOverlapFailure[]}
 */
function getAllOverlapFailures(tooSmallTargets, allTargets) {
  /** @type {TapTargetOverlapFailure[]} */
  const failures = [];

  tooSmallTargets.forEach(target => {
    // Convert client rects to unique tappable areas from a user's perspective
    const tappableRects = getTappableRectsFromClientRects(target.tapTarget.clientRects);

    for (const maybeOverlappingTarget of allTargets) {
      if (maybeOverlappingTarget === target) {
        // Checking the same target with itself, skip.
        continue;
      }

      if (!rectsTouchOrOverlap(target.paddedBoundsRect, maybeOverlappingTarget.paddedBoundsRect)) {
        // Bounding boxes (padded with half FINGER_SIZE_PX) don't overlap, skip.
        continue;
      }

      if (target.tapTarget.href === maybeOverlappingTarget.tapTarget.href) {
        const isHttpOrHttpsLink = /https?:\/\//.test(target.tapTarget.href);
        if (isHttpOrHttpsLink) {
          // No overlap because same target action, skip.
          continue;
        }
      }

      const maybeOverlappingRects = maybeOverlappingTarget.tapTarget.clientRects;
      if (allRectsContainedWithinEachOther(tappableRects, maybeOverlappingRects)) {
        // If one tap target is fully contained within the other that's
        // probably intentional (e.g. an item with a delete button inside).
        // We'll miss some problems because of this, but that's better
        // than falsely reporting a failure.
        continue;
      }

      const rectFailure = getOverlapFailureForTargetPair(tappableRects, maybeOverlappingRects);
      if (rectFailure) {
        failures.push({
          ...rectFailure,
          tapTarget: target.tapTarget,
          overlappingTarget: maybeOverlappingTarget.tapTarget,
        });
      }
    }
  });

  return failures;
}

/**
 * @param {LH.Artifacts.Rect[]} tappableRects
 * @param {LH.Artifacts.Rect[]} maybeOverlappingRects
 * @returns {ClientRectOverlapFailure | null}
 */
function getOverlapFailureForTargetPair(tappableRects, maybeOverlappingRects) {
  /** @type ClientRectOverlapFailure | null */
  let greatestFailure = null;

  for (const targetCR of tappableRects) {
    const fingerRect = getRectAtCenter(targetCR, FINGER_SIZE_PX);
    // Score indicates how much of the finger area overlaps each target when the user
    // taps on the center of targetCR
    const tapTargetScore = getRectOverlapArea(fingerRect, targetCR);

    for (const maybeOverlappingCR of maybeOverlappingRects) {
      const overlappingTargetScore = getRectOverlapArea(fingerRect, maybeOverlappingCR);

      const overlapScoreRatio = overlappingTargetScore / tapTargetScore;
      if (overlapScoreRatio < MAX_ACCEPTABLE_OVERLAP_SCORE_RATIO) {
        // low score means it's clear that the user tried to tap on the targetCR,
        // rather than the other tap target client rect
        continue;
      }

      // only update our state if this was the biggest failure we've seen for this pair
      if (!greatestFailure || overlapScoreRatio > greatestFailure.overlapScoreRatio) {
        greatestFailure = {
          overlapScoreRatio,
          tapTargetScore,
          overlappingTargetScore,
        };
      }
    }
  }
  return greatestFailure;
}

/**
 * Only report one failure if two targets overlap each other
 * @param {TapTargetOverlapFailure[]} overlapFailures
 * @returns {TapTargetOverlapFailure[]}
 */
function mergeSymmetricFailures(overlapFailures) {
  /** @type TapTargetOverlapFailure[] */
  const failuresAfterMerging = [];

  overlapFailures.forEach((failure, overlapFailureIndex) => {
    const symmetricFailure = overlapFailures.find(f =>
      f.tapTarget === failure.overlappingTarget &&
      f.overlappingTarget === failure.tapTarget
    );

    if (!symmetricFailure) {
      failuresAfterMerging.push(failure);
      return;
    }

    const {overlapScoreRatio: failureOSR} = failure;
    const {overlapScoreRatio: symmetricOSR} = symmetricFailure;
    // Push if:
    // - the current failure has a higher OSR
    // - OSRs are the same, and the current failure comes before its symmetric partner in the list
    // Otherwise do nothing and let the symmetric partner be pushed later.
    if (failureOSR > symmetricOSR || (
      failureOSR === symmetricOSR &&
      overlapFailureIndex < overlapFailures.indexOf(symmetricFailure)
    )) {
      failuresAfterMerging.push(failure);
    }
  });

  return failuresAfterMerging;
}

/**
 * @param {TapTargetOverlapFailure[]} overlapFailures
 * @returns {TapTargetTableItem[]}
 */
function getTableItems(overlapFailures) {
  const tableItems = overlapFailures.map(failure => {
    const largestCR = getLargestRect(failure.tapTarget.clientRects);
    const width = Math.floor(largestCR.width);
    const height = Math.floor(largestCR.height);
    const size = width + 'x' + height;
    return {
      tapTarget: targetToTableNode(failure.tapTarget),
      overlappingTarget: targetToTableNode(failure.overlappingTarget),
      tapTargetScore: failure.tapTargetScore,
      overlappingTargetScore: failure.overlappingTargetScore,
      overlapScoreRatio: failure.overlapScoreRatio,
      size,
      width,
      height,
    };
  });

  tableItems.sort((a, b) => {
    return b.overlapScoreRatio - a.overlapScoreRatio;
  });

  return tableItems;
}

/**
 * @param {LH.Artifacts.TapTarget} target
 * @returns {LH.Audit.Details.NodeValue}
 */
function targetToTableNode(target) {
  return {
    type: 'node',
    snippet: target.snippet,
    path: target.path,
    selector: target.selector,
    nodeLabel: target.nodeLabel,
  };
}

class TapTargets extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'tap-targets',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['MetaElements', 'TapTargets', 'TestedAsMobileDevice'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    if (!artifacts.TestedAsMobileDevice) {
      // Tap target sizes aren't important for desktop SEO, so disable the audit there.
      // On desktop people also tend to have more precise pointing devices than fingers.
      return {
        score: 1,
        notApplicable: true,
      };
    }

    const viewportMeta = await ComputedViewportMeta.request(artifacts.MetaElements, context);
    if (!viewportMeta.isMobileOptimized) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationViewportMetaNotOptimized),
      };
    }

    // Augment the targets with padded bounding rects for quick intersection testing.
    const boundedTapTargets = getBoundedTapTargets(artifacts.TapTargets);

    const tooSmallTargets = getTooSmallTargets(boundedTapTargets);
    const overlapFailures = getAllOverlapFailures(tooSmallTargets, boundedTapTargets);
    const overlapFailuresForDisplay = mergeSymmetricFailures(overlapFailures);
    const tableItems = getTableItems(overlapFailuresForDisplay);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'tapTarget', itemType: 'node', text: str_(UIStrings.tapTargetHeader)},
      {key: 'size', itemType: 'text', text: str_(i18n.UIStrings.columnSize)},
      {key: 'overlappingTarget', itemType: 'node', text: str_(UIStrings.overlappingTargetHeader)},
    ];

    const details = Audit.makeTableDetails(headings, tableItems);

    const tapTargetCount = artifacts.TapTargets.length;
    const failingTapTargetCount = new Set(overlapFailures.map(f => f.tapTarget)).size;
    const passingTapTargetCount = tapTargetCount - failingTapTargetCount;

    let score = 1;
    let passingTapTargetRatio = 1;
    if (failingTapTargetCount > 0) {
      passingTapTargetRatio = (passingTapTargetCount / tapTargetCount);
      // If there are any failures then we don't want the audit to pass,
      // so keep the score below 90.
      score = passingTapTargetRatio * 0.89;
    }
    const displayValue = str_(UIStrings.displayValue, {decimalProportion: passingTapTargetRatio});

    return {
      score,
      details,
      displayValue,
    };
  }
}

TapTargets.FINGER_SIZE_PX = FINGER_SIZE_PX;

module.exports = TapTargets;
module.exports.UIStrings = UIStrings;


/** @typedef {{
  overlapScoreRatio: number;
  tapTargetScore: number;
  overlappingTargetScore: number;
}} ClientRectOverlapFailure */

/** @typedef {{
  overlapScoreRatio: number;
  tapTargetScore: number;
  overlappingTargetScore: number;
  tapTarget: LH.Artifacts.TapTarget;
  overlappingTarget: LH.Artifacts.TapTarget;
}} TapTargetOverlapFailure */

/** @typedef {{
  paddedBoundsRect: LH.Artifacts.Rect;
  tapTarget: LH.Artifacts.TapTarget;
}} BoundedTapTarget */

/** @typedef {{
  tapTarget: LH.Audit.Details.NodeValue;
  overlappingTarget: LH.Audit.Details.NodeValue;
  size: string;
  overlapScoreRatio: number;
  height: number;
  width: number;
  tapTargetScore: number;
  overlappingTargetScore: number;
}} TapTargetTableItem */
