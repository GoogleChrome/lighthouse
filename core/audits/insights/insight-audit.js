/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NO_NAVIGATION} from '@paulirish/trace_engine/models/trace/types/TraceEvents.js';

import {ProcessedTrace} from '../../computed/processed-trace.js';
import {TraceEngineResult} from '../../computed/trace-engine-result.js';
import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const str_ = i18n.createIcuMessageFn(import.meta.url, {});

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Context} context
 * @return {Promise<{insights: import('@paulirish/trace_engine/models/trace/insights/types.js').InsightSet|undefined, parsedTrace: LH.Artifacts.TraceEngineResult['parsedTrace']}>}
 */
async function getInsightSet(artifacts, context) {
  const settings = context.settings;
  const trace = artifacts.Trace;
  const processedTrace = await ProcessedTrace.request(trace, context);
  const SourceMaps = artifacts.SourceMaps;
  const traceEngineResult = await TraceEngineResult.request({trace, settings, SourceMaps}, context);

  const navigationId = processedTrace.timeOriginEvt.args.data?.navigationId;
  const key = navigationId ?? NO_NAVIGATION;
  const insights = traceEngineResult.insights.get(key);

  return {insights, parsedTrace: traceEngineResult.parsedTrace};
}

/**
 * @typedef CreateDetailsExtras
 * @property {import('@paulirish/trace_engine/models/trace/insights/types.js').InsightSet} insights
 * @property {LH.Artifacts.TraceEngineResult['parsedTrace']} parsedTrace
 */

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Context} context
 * @param {T} insightName
 * @param {(insight: import('@paulirish/trace_engine/models/trace/insights/types.js').InsightModels[T], extras: CreateDetailsExtras) => {details: LH.Audit.Details, warnings: Array<string | LH.IcuMessage>}|LH.Audit.Details|undefined} createDetails
 * @template {keyof import('@paulirish/trace_engine/models/trace/insights/types.js').InsightModelsType} T
 * @return {Promise<LH.Audit.Product>}
 */
async function adaptInsightToAuditProduct(artifacts, context, insightName, createDetails) {
  const {insights, parsedTrace} = await getInsightSet(artifacts, context);
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

  const cbResult = createDetails(insight, {
    parsedTrace,
    insights,
  });

  const warnings = [...insight.warnings ?? []];

  let details;
  if (cbResult && 'warnings' in cbResult) {
    details = cbResult.details;
    warnings.push(...cbResult.warnings);
  } else {
    details = cbResult;
  }

  if (!details) {
    return {
      scoreDisplayMode: Audit.SCORING_MODES.NOT_APPLICABLE,
      score: null,
      details,
    };
  }

  if (insight.wastedBytes !== undefined) {
    if (!details.debugData) {
      details.debugData = {type: 'debugdata'};
    }
    details.debugData.wastedBytes = insight.wastedBytes;
  }

  // TODO: FontDisplay insight (and maybe others) can return -Infinity savings when
  // passing. That's weird. For now, just delete those.
  if (insight.metricSavings) {
    for (const [metric, value] of Object.entries(insight.metricSavings)) {
      if (!Number.isFinite(value)) {
        // @ts-expect-error
        delete insight.metricSavings[metric];
      }
    }
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

  // TODO: consider adding a `estimatedSavingsText` to InsightModel, which can capture
  // the exact i18n string used by RPP; and include the same est. timing savings.
  let displayValue;

  if (insight.wastedBytes) {
    displayValue = str_(i18n.UIStrings.displayValueByteSavings, {wastedBytes: insight.wastedBytes});
  } else {
    let wastedMs;

    switch (insight.insightKey) {
      case 'DocumentLatency':
      case 'DuplicatedJavaScript':
      case 'FontDisplay':
      case 'LegacyJavaScript':
      case 'RenderBlocking': {
        wastedMs = metricSavings?.FCP;
        break;
      }

      case 'LCPDiscovery':
      case 'ModernHTTP': {
        wastedMs = metricSavings?.LCP;
        break;
      }

      case 'Viewport': {
        wastedMs = metricSavings?.INP;
        break;
      }
    }

    if (wastedMs) {
      displayValue = str_(i18n.UIStrings.displayValueMsSavings, {wastedMs});
    }
  }

  let score;
  let scoreDisplayMode;
  if (insight.state === 'fail' || insight.state === 'pass') {
    score = insight.state === 'fail' ? 0 : 1;
    scoreDisplayMode =
      insight.metricSavings ? Audit.SCORING_MODES.METRIC_SAVINGS : Audit.SCORING_MODES.NUMERIC;
  } else {
    score = null;
    scoreDisplayMode = Audit.SCORING_MODES.INFORMATIVE;
  }

  return {
    scoreDisplayMode,
    score,
    metricSavings,
    warnings: warnings.length ? warnings : undefined,
    displayValue,
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
