/**
 * @license Copyright 2020 Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {computeMedianRun, filterToValidRuns} = require('../../lib/median-run.js');

describe('Median Runs', () => {
  function lhr(auditNumericValues) {
    const audits = {};
    for (const [id, numericValue] of Object.entries(auditNumericValues)) {
      audits[id] = {numericValue};
    }

    return {audits};
  }

  describe('computeMedianRun()', () => {
    it('should pick the median run on an odd set', () => {
      const runs = [
        lhr({'interactive': 100, 'first-contentful-paint': 100}),
        lhr({'interactive': 200, 'first-contentful-paint': 200}),
        lhr({'interactive': 300, 'first-contentful-paint': 300}),
        lhr({'interactive': 400, 'first-contentful-paint': 400}),
        lhr({'interactive': 500, 'first-contentful-paint': 500}),
      ];

      expect(computeMedianRun(runs)).toEqual(runs[2]);
    });

    it('should pick the median run on an even set', () => {
      const runs = [
        lhr({'interactive': 1000, 'first-contentful-paint': 400}),
        lhr({'interactive': 2000, 'first-contentful-paint': 500}),
        lhr({'interactive': 4000, 'first-contentful-paint': 200}),
        lhr({'interactive': 5000, 'first-contentful-paint': 100}),
      ];

      expect(computeMedianRun(runs)).toEqual(runs[2]);
    });

    it('should pick the lower median run on an even set as tiebreaker', () => {
      const runs = [
        lhr({'interactive': 100, 'first-contentful-paint': 100}),
        lhr({'interactive': 200, 'first-contentful-paint': 200}),
        lhr({'interactive': 400, 'first-contentful-paint': 400}),
        lhr({'interactive': 500, 'first-contentful-paint': 500}),
      ];

      expect(computeMedianRun(runs)).toEqual(runs[1]);
    });

    it('should avoid FCP outliers', () => {
      const runs = [
        lhr({'interactive': 100, 'first-contentful-paint': 100}),
        lhr({'interactive': 250, 'first-contentful-paint': 400}),
        lhr({'interactive': 300, 'first-contentful-paint': 10000}),
        lhr({'interactive': 400, 'first-contentful-paint': 400}),
        lhr({'interactive': 500, 'first-contentful-paint': 500}),
      ];

      expect(computeMedianRun(runs)).toEqual(runs[1]);
    });

    it('should avoid TTI outliers', () => {
      const runs = [
        lhr({'interactive': 100, 'first-contentful-paint': 100}),
        lhr({'interactive': 200, 'first-contentful-paint': 200}),
        lhr({'interactive': 10000, 'first-contentful-paint': 300}),
        lhr({'interactive': 300, 'first-contentful-paint': 400}),
        lhr({'interactive': 500, 'first-contentful-paint': 500}),
      ];

      expect(computeMedianRun(runs)).toEqual(runs[3]);
    });

    it('should throw on empty arrays', () => {
      expect(() => computeMedianRun([])).toThrow();
    });

    it('should throw when missing FCP', () => {
      expect(() => computeMedianRun([lhr({interactive: 500})])).toThrow();
    });

    it('should throw when missing TTI', () => {
      expect(() => computeMedianRun([lhr({'first-contentful-paint': 500})])).toThrow();
    });

    it('should throw on lhrs with missing audits', () => {
      const runs = [
        lhr({'interactive': 100, 'first-contentful-paint': 100}),
        lhr({'interactive': 200, 'first-contentful-paint': 200}),
        lhr({'first-contentful-paint': 300}),
        lhr({'interactive': 450}),
        lhr({'interactive': 500, 'first-contentful-paint': 500}),
      ];

      expect(() => computeMedianRun(runs)).toThrow();
    });
  });

  describe('filterToValidRuns()', () => {
    it('should filter down to only runs with FCP and TTI', () => {
      const runs = [
        lhr({'interactive': 100, 'first-contentful-paint': 100}),
        lhr({'interactive': 200, 'first-contentful-paint': 200}),
        lhr({'first-contentful-paint': 300}),
        lhr({'interactive': 450}),
        lhr({'interactive': 500, 'first-contentful-paint': 500}),
      ];

      expect(filterToValidRuns(runs)).toEqual([
        runs[0],
        runs[1],
        runs[4],
      ]);
    });
  });
});
