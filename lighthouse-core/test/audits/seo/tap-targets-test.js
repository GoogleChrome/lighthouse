/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const TapTargetsAudit = require('../../../audits/seo/tap-targets.js');
const assert = require('assert').strict;

const getFakeContext = () => ({computedCache: new Map()});

function auditTapTargets(tapTargets, {MetaElements = [{
  name: 'viewport',
  content: 'width=device-width',
}], TestedAsMobileDevice = true} = {}) {
  const artifacts = {
    TapTargets: tapTargets,
    MetaElements,
    TestedAsMobileDevice,
  };

  return TapTargetsAudit.audit(artifacts, getFakeContext());
}

const tapTargetSize = 10;
const minimalOverlapCausingDistance = (TapTargetsAudit.FINGER_SIZE_PX - tapTargetSize) / 2;
// 3px means it'll have 10x3=30px overlap with the finger, which is 30% of the tap targets own score
// and the failure cutoff is 25%
const pxOverlappedByFinger = 3;
const minimalFailingOverlapCausingDistance = minimalOverlapCausingDistance + pxOverlappedByFinger;

function getBorderlineTapTargets(options = {}) {
  function makeClientRects({x, y}) {
    return {
      left: x,
      top: y,
      width: tapTargetSize,
      height: tapTargetSize,
      bottom: y + tapTargetSize,
      right: x + tapTargetSize,
    };
  }

  const mainTapTarget = {
    snippet: '<main></main>',
    clientRects: [
      makeClientRects({
        x: 0,
        y: 0,
      }),
    ],
  };
  const tapTargetBelow = {
    snippet: '<below></below>',
    clientRects: [
      makeClientRects({
        x: 0,
        y: mainTapTarget.clientRects[0].top + TapTargetsAudit.FINGER_SIZE_PX,
      }),
    ],
  };
  const tapTargetToTheRight = {
    snippet: '<right></right>',
    clientRects: [
      makeClientRects({
        x: mainTapTarget.clientRects[0].left + TapTargetsAudit.FINGER_SIZE_PX,
        y: 0,
      }),
    ],
  };

  if (options.reduceRightWidth) {
    tapTargetToTheRight.clientRects[0].width -= 1;
    tapTargetToTheRight.clientRects[0].right -= 1;
  }
  if (options.increaseRightWidth) {
    tapTargetToTheRight.clientRects[0].width += 10;
    tapTargetToTheRight.clientRects[0].right += 10;
  }

  const targets = [mainTapTarget, tapTargetBelow, tapTargetToTheRight];

  const overlapAmount = minimalFailingOverlapCausingDistance;
  if (options.overlapRight) {
    tapTargetToTheRight.clientRects[0].left -= overlapAmount;
    tapTargetToTheRight.clientRects[0].right -= overlapAmount;
  }
  if (options.overlapBelow) {
    tapTargetBelow.clientRects[0].top -= overlapAmount;
    tapTargetBelow.clientRects[0].bottom -= overlapAmount;
  }
  if (options.addFullyContainedTapTarget) {
    targets.push({
      snippet: '<contained></contained>',
      clientRects: [
        makeClientRects({
          x: 0,
          y: 0,
        }),
      ],
    });
  }
  if (options.overlapSecondClientRect) {
    mainTapTarget.clientRects.push(
      makeClientRects({
        x: 0,
        y: overlapAmount,
      })
    );
  }

  return targets;
}

describe('SEO: Tap targets audit', () => {
  it('passes when there are no tap targets', async () => {
    const auditResult = await auditTapTargets([]);
    assert.equal(auditResult.score, 1);
    expect(auditResult.displayValue).toBeDisplayString('100% appropriately sized tap targets');
    assert.equal(auditResult.score, 1);
  });

  it('passes when tap targets don\'t overlap', async () => {
    const auditResult = await auditTapTargets(getBorderlineTapTargets());
    assert.equal(auditResult.score, 1);
  });

  it('passes when a target is fully contained in an overlapping target', async () => {
    const auditResult = await auditTapTargets(getBorderlineTapTargets({
      addFullyContainedTapTarget: true,
    }));
    assert.equal(auditResult.score, 1);
  });

  it('fails if two tap targets overlaps each other horizontally', async () => {
    const auditResult = await auditTapTargets(
      getBorderlineTapTargets({
        overlapRight: true,
      })
    );
    assert.equal(auditResult.score.toFixed(3), '0.297');
    assert.equal(Math.round(auditResult.score * 100), 30);
    const failure = auditResult.details.items[0];
    assert.equal(failure.tapTarget.snippet, '<main></main>');
    assert.equal(failure.overlappingTarget.snippet, '<right></right>');
    assert.equal(failure.size, '10x10');
    // Includes data for debugging/adjusting the scoring logic later on
    assert.equal(failure.tapTargetScore, tapTargetSize * tapTargetSize);
    assert.equal(failure.overlappingTargetScore, tapTargetSize * pxOverlappedByFinger);
    assert.equal(failure.overlapScoreRatio, 0.3);
    assert.equal(failure.width, 10);
    assert.equal(failure.height, 10);
  });

  it('fails if a tap target overlaps vertically', async () => {
    const auditResult = await auditTapTargets(
      getBorderlineTapTargets({
        overlapBelow: true,
      })
    );
    assert.equal(auditResult.score.toFixed(3), '0.297');
  });

  it('fails when one of the client rects overlaps', async () => {
    const auditResult = await auditTapTargets(
      getBorderlineTapTargets({
        overlapSecondClientRect: true,
      })
    );
    assert.equal(auditResult.score.toFixed(3), '0.297');
  });

  it('reports 2 items if a target overlapped both vertically and horizontally', async () => {
    // Main is overlapped by right + below, right and below are each overlapped by main
    const auditResult = await auditTapTargets(
      getBorderlineTapTargets({
        overlapRight: true,
        reduceRightWidth: true,
        overlapBelow: true,
      })
    );
    assert.equal(Math.round(auditResult.score * 100), 0); // all tap targets are overlapped by something
    const failures = auditResult.details.items;
    assert.equal(failures.length, 2);
    // Right and Main overlap each other, but Right has a worse score because it's smaller
    // so it's the failure that appears in the report
    assert.equal(failures[0].tapTarget.snippet, '<right></right>');
  });

  it('reports 1 failure if only one tap target involved in an overlap fails', async () => {
    const auditResult = await auditTapTargets(
      getBorderlineTapTargets({
        overlapRight: true,
        increaseRightWidth: true,
      })
    );
    assert.equal(Math.round(auditResult.score * 100), 59);
    const failures = auditResult.details.items;
    // <main> fails, but <right> doesn't
    assert.equal(failures[0].tapTarget.snippet, '<main></main>');
  });

  it('fails if no meta viewport tag is provided', async () => {
    const auditResult = await auditTapTargets([], {MetaElements: []});
    assert.equal(auditResult.score, 0);

    expect(auditResult.explanation).toBeDisplayString(
      /* eslint-disable max-len */
      'Tap targets are too small because there\'s no viewport meta tag optimized for mobile screens');
  });

  it('is not applicable on desktop', async () => {
    const auditResult = await auditTapTargets(getBorderlineTapTargets({
      overlapSecondClientRect: true,
    }), {TestedAsMobileDevice: false});
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.notApplicable, true);
  });
});
