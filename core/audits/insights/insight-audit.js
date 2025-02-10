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
 * @return {Promise<import('@paulirish/trace_engine/models/trace/insights/types.js').InsightSet|undefined>}
 */
async function getInsightSet(artifacts, context) {
  const trace = artifacts.traces[Audit.DEFAULT_PASS];
  const processedTrace = await ProcessedTrace.request(trace, context);
  const traceEngineResult = await TraceEngineResult.request({trace}, context);

  const navigationId = processedTrace.timeOriginEvt.args.data?.navigationId;
  const key = navigationId ?? NO_NAVIGATION;

  return traceEngineResult.insights.get(key);
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
  if (!insights) {
    return {
      scoreDisplayMode: Audit.SCORING_MODES.NOT_APPLICABLE,
      score: null,
    };
  }

  const insight = insights.model[insightName];
  if (insight instanceof Error) {
    return {
      errorMessage: insight.message,
      errorStack: insight.stack,
      score: null,
    };
  }

  const details = createDetails(insight);
  if (!details || (details.type === 'table' && details.headings.length === 0)) {
    return {
      scoreDisplayMode: Audit.SCORING_MODES.NOT_APPLICABLE,
      score: null,
    };
  }

  // This hack is to add metric adorners if an insight category links it to a metric,
  // but doesn't output a metric savings for that metric.
  let metricSavings = insight.metricSavings;
  if (insight.category === 'INP' && !metricSavings?.INP) {
    metricSavings = {...metricSavings, INP: /** @type {any} */ (0)};
  } else if (insight.category === 'CLS' && !metricSavings?.CLS) {
    metricSavings = {...metricSavings, CLS: /** @type {any} */ (0)};
  } else if (insight.category === 'LCP' && !metricSavings?.LCP) {
    metricSavings = {...metricSavings, LCP: /** @type {any} */ (0)};
  }

  let score = insight.shouldShow ? 0 : 1;
  // TODO: change insight model to denote passing/failing/informative. Until then... hack it.
  if (insightName === 'LCPPhases') {
    score = metricSavings?.LCP ?? 0 >= 1000 ? 0 : 1;
  } else if (insightName === 'InteractionToNextPaint') {
    score = metricSavings?.INP ?? 0 >= 500 ? 0 : 1;
  }

  return {
    scoreDisplayMode:
      insight.metricSavings ? Audit.SCORING_MODES.METRIC_SAVINGS : Audit.SCORING_MODES.NUMERIC,
    score,
    metricSavings,
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

/**
 * @param {LH.Artifacts.TraceElement[]} traceElements
 * @param {number|null|undefined} nodeId
 * @param {LH.IcuMessage|string} label
 * @return {LH.Audit.Details.Table|undefined}
 */
function maybeMakeNodeElementTable(traceElements, nodeId, label) {
  const node = makeNodeItemForNodeId(traceElements, nodeId);
  if (!node) {
    return;
  }

  return Audit.makeTableDetails([
    {key: 'node', valueType: 'node', label},
  ], [{node}]);
}

export {
  adaptInsightToAuditProduct,
  makeNodeItemForNodeId,
  maybeMakeNodeElementTable,
};
