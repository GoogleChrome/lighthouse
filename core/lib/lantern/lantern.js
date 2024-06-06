/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from './types/lantern.js';

/** @typedef {import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricName} MetricName */
/** @typedef {import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricScore} MetricScore */

/** @type {LH.Util.SelfMap<LH.Crdp.Network.ResourceType>} */
const NetworkRequestTypes = {
  XHR: 'XHR',
  Fetch: 'Fetch',
  EventSource: 'EventSource',
  Script: 'Script',
  Stylesheet: 'Stylesheet',
  Image: 'Image',
  Media: 'Media',
  Font: 'Font',
  Document: 'Document',
  TextTrack: 'TextTrack',
  WebSocket: 'WebSocket',
  Other: 'Other',
  Manifest: 'Manifest',
  SignedExchange: 'SignedExchange',
  Ping: 'Ping',
  Preflight: 'Preflight',
  CSPViolationReport: 'CSPViolationReport',
  Prefetch: 'Prefetch',
};

/**
 * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
 * @return {Lantern.Simulation.ProcessedNavigation}
 */
function createProcessedNavigation(traceEngineResult) {
  const Meta = traceEngineResult.data.Meta;
  const frameId = Meta.mainFrameId;
  const navigationId = Meta.mainFrameNavigations[0].args.data?.navigationId || '';
  const scores =
    traceEngineResult.data.PageLoadMetrics.metricScoresByFrameId.get(frameId)?.get(navigationId);
  /** @param {MetricName} metric */
  const getTimestampOrUndefined = metric => {
    const metricScore = scores?.get(metric);
    if (!metricScore?.event) return;
    return metricScore.event.ts;
  };
  /** @param {MetricName} metric */
  const getTimestamp = metric => {
    const metricScore = scores?.get(metric);
    if (!metricScore?.event) throw new Error(`missing metric: ${metric}`);
    return metricScore.event.ts;
  };
  // TODO: should use `MetricName.LCP`, but it is a const enum.
  const FCP = /** @type {MetricName} */('FCP');
  const LCP = /** @type {MetricName} */('LCP');
  return {
    timestamps: {
      firstContentfulPaint: getTimestamp(FCP),
      largestContentfulPaint: getTimestampOrUndefined(LCP),
    },
  };
}

export {
  NetworkRequestTypes,
  createProcessedNavigation,
};
