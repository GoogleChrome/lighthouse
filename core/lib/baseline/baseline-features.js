/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import bundledFeatures from "./baseline-features.json" with { type: "json" };

/**
 * Returns the baseline status and release dates for a given feature ID.
 * @param {string} featureId
 * @return {{status: boolean|string, baseline_low_date?: string, baseline_high_date?: string}|null}
 */
export function getFeatureStatus(featureId) {
  if (featureId in bundledFeatures) {
    /** @type {{status: boolean|string, baselineLowDate?: string, baselineHighDate?: string}} */
    const feature =
      bundledFeatures[
        /** @type {keyof typeof bundledFeatures} */ (featureId)
      ];

    return {
      status: feature.status,
      baseline_low_date: feature.baselineLowDate,
      baseline_high_date: feature.baselineHighDate,
    };
  } else {
    return null;
  }
}
