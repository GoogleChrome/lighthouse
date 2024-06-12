/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from './types/lantern.js';

/** @type {Lantern.Util.SelfMap<Lantern.ResourceType>} */
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

export {BaseNode} from './BaseNode.js';
export {CPUNode} from './CpuNode.js';
export {LanternError as Error} from './LanternError.js';
export {Metric} from './Metric.js';
export {NetworkNode} from './NetworkNode.js';
export {PageDependencyGraph} from './PageDependencyGraph.js';
export * as Metrics from './metrics/metrics.js';
export * as Simulation from './simulation/simulation.js';
export * as TBTUtils from './TBTUtils.js';
export * as TraceEngineComputationData from './TraceEngineComputationData.js';

/** @template [T=any] @typedef {Lantern.NetworkRequest<T>} NetworkRequest */
/** @typedef {Lantern.ResourcePriority} ResourcePriority */
/** @typedef {Lantern.ResourceTiming} ResourceTiming */
/** @typedef {Lantern.ResourceType} ResourceType */
/** @typedef {Lantern.Trace} Trace */
/** @typedef {Lantern.TraceEvent} TraceEvent */

export {
  NetworkRequestTypes,
};
