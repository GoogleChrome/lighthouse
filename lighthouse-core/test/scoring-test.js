/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const ReportScoring = require('../scoring.js');

/* eslint-env jest */
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
        'my-boolean-audit': {score: 1, extendedInfo: {}},
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
        'my-boolean-audit': {score: 1, extendedInfo: {}, scoreDisplayMode: 'notApplicable'},
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
