/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import defaultConfig from '../../config/default-config.js';
import {ReportScoring} from '../../scoring.js';

describe('Default Config', () => {
  it('relevantAudits map to existing perf audit', () => {
    const metricsWithRelevantAudits = defaultConfig.categories.performance.auditRefs.filter(a =>
        a.relevantAudits);
    const allPerfAuditIds = defaultConfig.categories.performance.auditRefs.map(a => a.id);

    for (const metric of metricsWithRelevantAudits) {
      assert.ok(Array.isArray(metric.relevantAudits) && metric.relevantAudits.length);

      for (const auditid of metric.relevantAudits) {
        const errMsg = `(${auditid}) is relevant audit for (${metric.id}), but no audit found.`;
        assert.ok(allPerfAuditIds.includes(auditid), errMsg);
      }
    }
  });

  it('SEO fails if is-crawlable is failing', () => {
    const scores = defaultConfig.categories.seo.auditRefs.map(auditRef => ({
      score: auditRef.id === 'is-crawlable' ? 0 : 1,
      weight: auditRef.weight,
    }));
    const score = ReportScoring.arithmeticMean(scores);
    assert(score < 0.7);
    assert(score >= 0.65);
  });
});
