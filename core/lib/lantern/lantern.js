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

// These constants should all match the ones inside Lighthouse's `constants.js`.
const DEVTOOLS_RTT_ADJUSTMENT_FACTOR = 3.75;
const DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR = 0.9;

const constants = {
  DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
  DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
  // These values align with WebPageTest's definition of "Fast 3G"
  // But offer similar characteristics to roughly the 75th percentile of 4G connections.
  mobileSlow4G: {
    rttMs: 150,
    throughputKbps: 1.6 * 1024,
    requestLatencyMs: 150 * DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
    downloadThroughputKbps: 1.6 * 1024 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    uploadThroughputKbps: 750 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    cpuSlowdownMultiplier: 4,
  },
};

export {
  NetworkRequestTypes,
  constants,
};
