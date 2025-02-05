/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NO_NAVIGATION} from '@paulirish/trace_engine/models/trace/types/TraceEvents.js';

import {ProcessedTrace} from '../../computed/processed-trace.js';
import {TraceEngineResult} from '../../computed/trace-engine-result.js';
import {Audit} from '../audit.js';

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Context} context
 * @return {Promise<import('@paulirish/trace_engine/models/trace/insights/types.js').InsightSet>}
 */
async function getInsightSet(artifacts, context) {
  const trace = artifacts.traces[Audit.DEFAULT_PASS];

  const processedTrace = await ProcessedTrace.request(trace, context);
  const traceEngineResult = await TraceEngineResult.request({trace}, context);

  const navigationId = processedTrace.timeOriginEvt.args.data?.navigationId;
  const key = navigationId ?? NO_NAVIGATION;
  const insights = traceEngineResult.insights.get(key);
  if (!insights) throw new Error('No navigations insights found');

  return insights;
}

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Context} context
 * @param {T} insightName
 * @param {(insight: import('@paulirish/trace_engine/models/trace/insights/types.js').InsightModels[T]) => LH.Audit.Details|undefined} createDetails
 * @template {keyof import('@paulirish/trace_engine/models/trace/insights/types.js').InsightModelsType} T
 * @return {Promise<LH.Audit.Product>}
 */
async function adaptInsightToAuditProduct(artifacts, context, insightName, createDetails) {
  const insights = await getInsightSet(artifacts, context);
  const insight = insights.model[insightName];
  const details = createDetails(insight);
  return {
    score: insight.shouldShow ? 0 : 1,
    metricSavings: insight.metricSavings,
    warnings: insight.warnings,
    details,
  };
}

/**
 * @param {LH.Artifacts.TraceElement[]} traceElements
 * @param {number|null|undefined} nodeId
 * @return {LH.Audit.Details.NodeValue|undefined}
 */
function makeNodeItemForNodeId(traceElements, nodeId) {
  if (typeof nodeId !== 'number') {
    return;
  }

  const traceElement =
    traceElements.find(te => te.traceEventType === 'trace-engine' && te.nodeId === nodeId);
  const node = traceElement?.node;
  if (!node) {
    return;
  }

  return Audit.makeNodeItem(node);
}

export {
  adaptInsightToAuditProduct,
  makeNodeItemForNodeId,
};
