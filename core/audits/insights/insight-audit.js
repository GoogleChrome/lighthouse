/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NavigationInsights} from '../../computed/navigation-insights.js';
import {Audit} from '../audit.js';

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Context} context
 * @param {T} insightName
 * @param {(insight: import('@paulirish/trace_engine/models/trace/insights/types.js').InsightModels[T]) => LH.Audit.Details|undefined} createDetails
 * @template {keyof import('@paulirish/trace_engine/models/trace/insights/types.js').InsightModelsType} T
 * @return {Promise<LH.Audit.Product>}
 */
async function adaptInsightToAuditProduct(artifacts, context, insightName, createDetails) {
  const trace = artifacts.traces[Audit.DEFAULT_PASS];
  const navInsights = await NavigationInsights.request(trace, context);
  const insight = navInsights.model[insightName];
  const details = createDetails(insight);
  return {
    score: insight.shouldShow ? 0 : 1,
    metricSavings: insight.metricSavings,
    warnings: insight.warnings,
    details,
  };
}

export {adaptInsightToAuditProduct};
