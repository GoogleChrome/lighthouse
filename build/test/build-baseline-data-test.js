/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {buildBaselineData} from '../build-baseline-data.js';

describe('buildBaselineData', () => {
  it('should filter non-features and features without baseline status', () => {
    const mockFeatures = /** @type {any} */ ({
      'not-a-feature': {
        kind: 'other',
        status: {baseline: 'high'},
      },
      'no-baseline': {
        kind: 'feature',
        status: {foo: 'bar'},
      },
    });

    const result = buildBaselineData(mockFeatures);
    expect(result).toEqual({});
  });

  it('should extract baseline boolean status without dates', () => {
    const mockFeatures = /** @type {any} */ ({
      'boolean-feature': {
        kind: 'feature',
        status: {baseline: false},
      },
    });

    const result = buildBaselineData(mockFeatures);
    expect(result).toEqual({
      'boolean-feature': {status: false},
    });
  });

  it('should extract baseline string status and dates', () => {
    const mockFeatures = /** @type {any} */ ({
      'full-feature': {
        kind: 'feature',
        status: {
          baseline: 'high',
          baseline_low_date: '2020-01-01',
          baseline_high_date: '2022-01-01',
        },
      },
      'low-feature': {
        kind: 'feature',
        status: {
          baseline: 'low',
          baseline_low_date: '2024-01-01',
        },
      },
    });

    const result = buildBaselineData(mockFeatures);
    expect(result).toEqual({
      'full-feature': {
        status: 'high',
        baselineLowDate: '2020-01-01',
        baselineHighDate: '2022-01-01',
      },
      'low-feature': {
        status: 'low',
        baselineLowDate: '2024-01-01',
      },
    });
  });
});
