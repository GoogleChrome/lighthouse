/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {getFeatureStatus} from '../../lib/baseline/baseline-features.js';

describe('baseline-features', () => {
  describe('getFeatureStatus', () => {
    it('should return widely available feature properties', () => {
      // "a" is a known widely available feature in baseline-features.json
      const result = getFeatureStatus('a');
      expect(result).toMatchObject({
        status: 'high',
        // Dates exist and are strings
        baseline_low_date: expect.any(String),
        baseline_high_date: expect.any(String),
      });
    });

    it('should return newly available feature properties', () => {
      // "abortsignal-any" is a known newly available feature
      const result = getFeatureStatus('abortsignal-any');
      expect(result).toMatchObject({
        status: 'low',
        baseline_low_date: expect.any(String),
      });
      // newly available features do not yet have a high date
      expect(result?.baseline_high_date).toBeUndefined();
    });

    it('should return limited availability feature properties', () => {
      // "accelerometer" is a feature with false status (limited availability)
      const result = getFeatureStatus('accelerometer');
      expect(result).toEqual({
        status: false,
        baseline_low_date: undefined,
        baseline_high_date: undefined,
      });
    });

    it('should return null for unknown features', () => {
      const result = getFeatureStatus('this-feature-does-not-exist');
      expect(result).toBeNull();
    });
  });
});
