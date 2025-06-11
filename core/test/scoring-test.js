/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {ReportScoring} from '../scoring.js';

describe('ReportScoring', () => {
  describe('#arithmeticMean', () => {
    it('should work for empty list', () => {
      assert.equal(ReportScoring.arithmeticMean([]), 0);
    });

    it('should work for equal weights', () => {
      assert.equal(ReportScoring.arithmeticMean([
        {score: 0.1, weight: 1},
        {score: 0.2, weight: 1},
        {score: 0.03, weight: 1},
      ]), 0.11);
    });

    it('should work for varying weights', () => {
      assert.equal(ReportScoring.arithmeticMean([
        {score: 0.1, weight: 2},
        {score: 0, weight: 7},
        {score: 0.2, weight: 1},
      ]), 0.04);
    });
  });

  describe('#scoreAllCategories', () => {
    it('should score the categories', () => {
      const resultsByAuditId = {
        'my-audit': {score: 0},
        'my-boolean-audit': {score: 1},
        'my-scored-audit': {score: 1},
        'my-failed-audit': {score: 0.2},
        'my-boolean-failed-audit': {score: 0},
      };

      const categories = {
        categoryA: {auditRefs: [{id: 'my-audit'}]},
        categoryB: {
          auditRefs: [
            {id: 'my-boolean-audit', weight: 1},
            {id: 'my-scored-audit', weight: 1},
            {id: 'my-failed-audit', weight: 1},
            {id: 'my-boolean-failed-audit', weight: 1},
          ],
        },
      };

      const scoredCategories = ReportScoring.scoreAllCategories(categories, resultsByAuditId);

      assert.equal(scoredCategories.categoryA.id, 'categoryA');
      assert.equal(scoredCategories.categoryA.score, 0);
      assert.equal(scoredCategories.categoryB.id, 'categoryB');
      assert.equal(scoredCategories.categoryB.score, 0.55);
    });

    it('should weight notApplicable audits as 0', () => {
      const resultsByAuditId = {
        'my-boolean-audit': {score: 1, scoreDisplayMode: 'notApplicable'},
        'my-scored-audit': {score: 1},
        'my-failed-audit': {score: 0.2, scoreDisplayMode: 'notApplicable'},
        'my-boolean-failed-audit': {score: 0},
      };

      const categories = {
        categoryA: {
          auditRefs: [
            {id: 'my-boolean-audit', weight: 1},
            {id: 'my-scored-audit', weight: 1},
            {id: 'my-failed-audit', weight: 1},
            {id: 'my-boolean-failed-audit', weight: 1},
          ],
        },
      };

      const scoredCategories = ReportScoring.scoreAllCategories(categories, resultsByAuditId);

      assert.equal(scoredCategories.categoryA.id, 'categoryA');
      assert.equal(scoredCategories.categoryA.score, 0.5);
    });
  });
});
