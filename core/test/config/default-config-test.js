/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import defaultConfig from '../../config/default-config.js';
import {ReportScoring} from '../../scoring.js';

describe('Default Config', () => {
  it('SEO fails if is-crawlable is failing', () => {
    assert.ok(defaultConfig.categories);
    const scores = defaultConfig.categories.seo.auditRefs.map(auditRef => ({
      score: auditRef.id === 'is-crawlable' ? 0 : 1,
      weight: auditRef.weight,
    }));
    const score = ReportScoring.arithmeticMean(scores);
    assert(score !== null);
    assert(score < 0.7);
    assert(score >= 0.65);
  });
});
