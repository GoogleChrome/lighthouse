/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as statistics from '../statistics.js';

describe('statistics', () => {
  describe('#getLogNormalScore', () => {
    it('creates a log normal distribution', () => {
      // This curve plotted with the below parameters.
      // https://www.desmos.com/calculator/ywkivb78cd
      const params = {
        median: 7300,
        p10: 3785,
      };
      const {getLogNormalScore} = statistics;

      // Be stricter with the control point requirements.
      expect(getLogNormalScore(params, 7300)).toEqual(0.5);
      expect(getLogNormalScore(params, 3785)).toEqual(0.9);

      expect(getLogNormalScore(params, 0)).toEqual(1);
      expect(getLogNormalScore(params, 1000)).toBeCloseTo(1.00);
      expect(getLogNormalScore(params, 2500)).toBeCloseTo(0.98);
      expect(getLogNormalScore(params, 5000)).toBeCloseTo(0.77);
      expect(getLogNormalScore(params, 7300)).toEqual(0.5);
      expect(getLogNormalScore(params, 7500)).toBeCloseTo(0.48);
      expect(getLogNormalScore(params, 10000)).toBeCloseTo(0.27);
      expect(getLogNormalScore(params, 30000)).toBeCloseTo(0.00);
      expect(getLogNormalScore(params, 1000000)).toEqual(0);
    });

    it('returns 1 for all non-positive values', () => {
      const params = {
        median: 1000,
        p10: 500,
      };
      const {getLogNormalScore} = statistics;
      expect(getLogNormalScore(params, -100000)).toEqual(1);
      expect(getLogNormalScore(params, -1)).toEqual(1);
      expect(getLogNormalScore(params, 0)).toEqual(1);
    });

    it('throws on a non-positive median parameter', () => {
      expect(() => {
        statistics.getLogNormalScore({median: 0, p10: 500}, 50);
      }).toThrow('median must be greater than zero');
      expect(() => {
        statistics.getLogNormalScore({median: -100, p90: 500}, 50);
      }).toThrow('median must be greater than zero');
    });

    it('throws on a non-positive p10 parameter', () => {
      expect(() => {
        statistics.getLogNormalScore({median: 500, p10: 0}, 50);
      }).toThrow('p10 must be greater than zero');
      expect(() => {
        statistics.getLogNormalScore({median: 500, p10: -100}, 50);
      }).toThrow('p10 must be greater than zero');
    });

    it('throws if p10 is not less than the median', () => {
      expect(() => {
        statistics.getLogNormalScore({median: 500, p10: 500}, 50);
      }).toThrow('p10 must be less than the median');
      expect(() => {
        statistics.getLogNormalScore({median: 500, p10: 1000}, 50);
      }).toThrow('p10 must be less than the median');
    });

    describe('score is in correct pass/average/fail range', () => {
      /**
       * Returns the next larger representable double value.
       * @type {number} value
       */
      function plusOneUlp(value) {
        const f64 = new Float64Array([value]);
        const big64 = new BigInt64Array(f64.buffer);
        big64[0] += 1n;
        return f64[0];
      }

      /**
       * Returns the next smaller representable double value.
       * @type {number} value
       */
      function minusOneUlp(value) {
        if (value === 0) throw new Error(`yeah, can't do that`);
        const f64 = new Float64Array([value]);
        const big64 = new BigInt64Array(f64.buffer);
        big64[0] -= 1n;
        return f64[0];
      }

      const {getLogNormalScore} = statistics;
      const controlPoints = [
        {p10: 200, median: 600},
        {p10: 3387, median: 5800},
        {p10: 0.1, median: 0.25},
        {p10: 28 * 1024, median: 128 * 1024},
        {p10: Number.MIN_VALUE, median: plusOneUlp(Number.MIN_VALUE)},
        {p10: Number.MIN_VALUE, median: 21.239999999999977},
        {p10: 99.56000000000073, median: 99.56000000000074},
        {p10: minusOneUlp(Number.MAX_VALUE), median: Number.MAX_VALUE},
        {p10: Number.MIN_VALUE, median: Number.MAX_VALUE},
      ];

      for (const {p10, median} of controlPoints) {
        it(`is on the right side of the thresholds for {p10: ${p10}, median: ${median}}`, () => {
          const params = {p10, median};

          // Max 1 at 0, everything else must be ≤ 1.
          expect(getLogNormalScore(params, 0)).toEqual(1);
          expect(getLogNormalScore(params, plusOneUlp(0))).toBeLessThanOrEqual(1);

          // Just better than passing threshold.
          expect(getLogNormalScore(params, minusOneUlp(p10))).toBeGreaterThanOrEqual(0.9);
          // At passing threshold.
          expect(getLogNormalScore(params, p10)).toEqual(0.9);
          // Just worse than passing threshold.
          expect(getLogNormalScore(params, plusOneUlp(p10))).toBeLessThan(0.9);

          // Just better than average threshold.
          expect(getLogNormalScore(params, minusOneUlp(median))).toBeGreaterThanOrEqual(0.5);
          // At average threshold.
          expect(getLogNormalScore(params, median)).toEqual(0.5);
          // Just worse than passing threshold.
          expect(getLogNormalScore(params, plusOneUlp(median))).toBeLessThan(0.5);

          // Some curves never quite reach 0, so just assert some extreme values aren't negative.
          expect(getLogNormalScore(params, 1_000_000_000)).toBeGreaterThanOrEqual(0);
          expect(getLogNormalScore(params, Number.MAX_SAFE_INTEGER)).toBeGreaterThanOrEqual(0);
          expect(getLogNormalScore(params, Number.MAX_VALUE)).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe('#linearInterpolation', () => {
    it('correctly interpolates when slope is 2', () => {
      const slopeOf2 = x => statistics.linearInterpolation(0, 0, 10, 20, x);
      expect(slopeOf2(-10)).toEqual(-20);
      expect(slopeOf2(5)).toEqual(10);
      expect(slopeOf2(10)).toEqual(20);
    });

    it('correctly interpolates when slope is 0', () => {
      const slopeOf0 = x => statistics.linearInterpolation(0, 0, 10, 0, x);
      expect(slopeOf0(-10)).toEqual(0);
      expect(slopeOf0(5)).toEqual(0);
      expect(slopeOf0(10)).toEqual(0);
    });
  });
});
