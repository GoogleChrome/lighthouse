/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lib/lantern/lantern.js';

const throttling = Lantern.Simulation.Constants.throttling;

/**
 * @type {Required<LH.SharedFlagsSettings['screenEmulation']>}
 */
const MOTOGPOWER_EMULATION_METRICS = {
  mobile: true,
  width: 412,
  height: 823,
  // This value has some interesting ramifications for image-size-responsive, see:
  // https://github.com/GoogleChrome/lighthouse/issues/10741#issuecomment-626903508
  deviceScaleFactor: 1.75,
  disabled: false,
};

/**
 * Desktop metrics adapted from emulated_devices/module.json
 * @type {Required<LH.SharedFlagsSettings['screenEmulation']>}
 */
const DESKTOP_EMULATION_METRICS = {
  mobile: false,
  width: 1350,
  height: 940,
  deviceScaleFactor: 1,
  disabled: false,
};

const screenEmulationMetrics = {
  mobile: MOTOGPOWER_EMULATION_METRICS,
  desktop: DESKTOP_EMULATION_METRICS,
};


const MOTOG4_USERAGENT = 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36'; // eslint-disable-line max-len
const DESKTOP_USERAGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'; // eslint-disable-line max-len

const userAgents = {
  mobile: MOTOG4_USERAGENT,
  desktop: DESKTOP_USERAGENT,
};

/** @type {LH.Config.Settings} */
const defaultSettings = {
  output: 'json',
  maxWaitForFcp: 30 * 1000,
  maxWaitForLoad: 45 * 1000,
  pauseAfterFcpMs: 1000,
  pauseAfterLoadMs: 1000,
  networkQuietThresholdMs: 1000,
  cpuQuietThresholdMs: 1000,

  formFactor: 'mobile',
  throttling: throttling.mobileSlow4G,
  throttlingMethod: 'simulate',
  screenEmulation: screenEmulationMetrics.mobile,
  emulatedUserAgent: userAgents.mobile,

  auditMode: false,
  gatherMode: false,
  clearStorageTypes: ['file_systems', 'shader_cache', 'service_workers', 'cache_storage'],
  disableStorageReset: false,
  debugNavigation: false,
  channel: 'node',
  usePassiveGathering: false,
  disableFullPageScreenshot: false,
  skipAboutBlank: false,
  blankPage: 'about:blank',
  ignoreStatusCode: false,

  // the following settings have no defaults but we still want ensure that `key in settings`
  // in config will work in a typechecked way
  locale: 'en-US', // actual default determined by Config using lib/i18n
  blockedUrlPatterns: null,
  additionalTraceCategories: null,
  extraHeaders: null,
  precomputedLanternData: null,
  onlyAudits: null,
  onlyCategories: null,
  skipAudits: null,
};

const nonSimulatedSettingsOverrides = {
  pauseAfterFcpMs: 5250,
  pauseAfterLoadMs: 5250,
  networkQuietThresholdMs: 5250,
  cpuQuietThresholdMs: 5250,
};

export {
  throttling,
  screenEmulationMetrics,
  userAgents,
  defaultSettings,
  nonSimulatedSettingsOverrides,
};
