/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const statistics = require('../../lib/statistics.js');

describe('statistics', () => {
  describe('#getLogNormalDistribution', () => {
    it('creates a log normal distribution', () => {
      // This curve plotted with the below percentile assertions
      // https://www.desmos.com/calculator/vjk2rwd17y

      const median = 5000;
      const pODM = 3500;
      const dist = statistics.getLogNormalDistribution(median, pODM);

      expect(dist.computeComplementaryPercentile(2000)).toBeCloseTo(1.00);
      expect(dist.computeComplementaryPercentile(3000)).toBeCloseTo(0.98);
      expect(dist.computeComplementaryPercentile(3500)).toBeCloseTo(0.92);
      expect(dist.computeComplementaryPercentile(4000)).toBeCloseTo(0.81);
      expect(dist.computeComplementaryPercentile(5000)).toBeCloseTo(0.50);
      expect(dist.computeComplementaryPercentile(6000)).toBeCloseTo(0.24);
      expect(dist.computeComplementaryPercentile(7000)).toBeCloseTo(0.09);
      expect(dist.computeComplementaryPercentile(8000)).toBeCloseTo(0.03);
      expect(dist.computeComplementaryPercentile(9000)).toBeCloseTo(0.01);
      expect(dist.computeComplementaryPercentile(10000)).toBeCloseTo(0.00);
    });
  });

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
      expect(getLogNormalScore(params, 3785)).toBeCloseTo(0.9, 6);

      expect(getLogNormalScore(params, 0)).toEqual(1);
      expect(getLogNormalScore(params, 1000)).toBeCloseTo(1.00);
      expect(getLogNormalScore(params, 2500)).toBeCloseTo(0.98);
      expect(getLogNormalScore(params, 5000)).toBeCloseTo(0.77);
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
