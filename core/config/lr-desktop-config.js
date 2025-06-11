/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as constants from './constants.js';

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    maxWaitForFcp: 15 * 1000,
    maxWaitForLoad: 35 * 1000,
    formFactor: 'desktop',
    throttling: constants.throttling.desktopDense4G,
    screenEmulation: constants.screenEmulationMetrics.desktop,
    emulatedUserAgent: constants.userAgents.desktop,
    skipAudits: [
      // Skip the h2 audit so it doesn't lie to us. See https://github.com/GoogleChrome/lighthouse/issues/6539
      'uses-http2',
      'modern-http-insight',
      // There are always bf-cache failures when testing in headless. Reenable when headless can give us realistic bf-cache insights.
      'bf-cache',
    ],
  },
};

export default config;
