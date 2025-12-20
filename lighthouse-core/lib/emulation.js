/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../gather/driver.js')} Driver */

/**
 * @type {LH.Crdp.Emulation.SetDeviceMetricsOverrideRequest}
 */
const MOTOG4_EMULATION_METRICS = {
  mobile: true,
  screenWidth: 360,
  screenHeight: 640,
  width: 360,
  height: 640,
  positionX: 0,
  positionY: 0,
  scale: 1,
  // Moto G4 is really 3, but a higher value here works against
  // our perf recommendations.
  // https://github.com/GoogleChrome/lighthouse/issues/10741#issuecomment-626903508
  deviceScaleFactor: 2.625,
  screenOrientation: {
    angle: 0,
    type: 'portraitPrimary',
  },
};

/**
 * Desktop metrics adapted from emulated_devices/module.json
 * @type {LH.Crdp.Emulation.SetDeviceMetricsOverrideRequest}
 */
const DESKTOP_EMULATION_METRICS = {
  mobile: false,
  width: 1350,
  height: 940,
  deviceScaleFactor: 1,
};

// eslint-disable-next-line max-len
const MOTOG4_USERAGENT = 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4143.7 Mobile Safari/537.36 Chrome-Lighthouse';
// eslint-disable-next-line max-len
const DESKTOP_USERAGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4143.7 Safari/537.36 Chrome-Lighthouse';

const OFFLINE_METRICS = {
  offline: true,
  // values of 0 remove any active throttling. crbug.com/456324#c9
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
};

const NO_THROTTLING_METRICS = {
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
  offline: false,
};

const NO_CPU_THROTTLE_METRICS = {
  rate: 1,
};

const emulationParams = {
  mobile: {
    userAgent: MOTOG4_USERAGENT,
    metrics: MOTOG4_EMULATION_METRICS,
    touchEnabled: true,
  },
  desktop: {
    userAgent: DESKTOP_USERAGENT,
    metrics: DESKTOP_EMULATION_METRICS,
    touchEnabled: false,
  },
};

/**
 *
 * @param {Driver} driver
 * @param {LH.Config.Settings} settings
 * @return {Promise<void>}
 */
async function emulate(driver, settings) {
  if (!settings.emulatedFormFactor || settings.emulatedFormFactor === 'none') return;
  const params = emulationParams[settings.emulatedFormFactor];

  // In DevTools, emulation is applied before Lighthouse starts (to deal with viewport emulation bugs)
  // As a result, we don't double-apply viewport emulation (devtools sets `internalDisableDeviceScreenEmulation`).
  // UA emulation, however, is lost in the protocol handover from devtools frontend to the audits_worker. So it's always applied.

  // Network.enable must be called for UA overriding to work
  await driver.sendCommand('Network.enable');
  await driver.sendCommand('Network.setUserAgentOverride', {userAgent: params.userAgent});

  if (!settings.internalDisableDeviceScreenEmulation) {
    await driver.sendCommand('Emulation.setDeviceMetricsOverride', params.metrics);
    await driver.sendCommand('Emulation.setTouchEmulationEnabled', {enabled: params.touchEnabled});
  }
}


/**
 * @param {Driver} driver
 * @param {Required<LH.ThrottlingSettings>} throttlingSettings
 * @return {Promise<void>}
 */
function enableNetworkThrottling(driver, throttlingSettings) {
  /** @type {LH.Crdp.Network.EmulateNetworkConditionsRequest} */
  const conditions = {
    offline: false,
    latency: throttlingSettings.requestLatencyMs || 0,
    downloadThroughput: throttlingSettings.downloadThroughputKbps || 0,
    uploadThroughput: throttlingSettings.uploadThroughputKbps || 0,
  };

  // DevTools expects throughput in bytes per second rather than kbps
  conditions.downloadThroughput = Math.floor(conditions.downloadThroughput * 1024 / 8);
  conditions.uploadThroughput = Math.floor(conditions.uploadThroughput * 1024 / 8);
  return driver.sendCommand('Network.emulateNetworkConditions', conditions);
}

/**
 * @param {Driver} driver
 * @return {Promise<void>}
 */
function clearAllNetworkEmulation(driver) {
  return driver.sendCommand('Network.emulateNetworkConditions', NO_THROTTLING_METRICS);
}

/**
 * @param {Driver} driver
 * @return {Promise<void>}
 */
function goOffline(driver) {
  return driver.sendCommand('Network.emulateNetworkConditions', OFFLINE_METRICS);
}

/**
 * @param {Driver} driver
 * @param {Required<LH.ThrottlingSettings>} throttlingSettings
 * @return {Promise<void>}
 */
function enableCPUThrottling(driver, throttlingSettings) {
  const rate = throttlingSettings.cpuSlowdownMultiplier;
  return driver.sendCommand('Emulation.setCPUThrottlingRate', {rate});
}

/**
 * @param {Driver} driver
 * @return {Promise<void>}
 */
function disableCPUThrottling(driver) {
  return driver.sendCommand('Emulation.setCPUThrottlingRate', NO_CPU_THROTTLE_METRICS);
}

module.exports = {
  emulate,
  enableNetworkThrottling,
  clearAllNetworkEmulation,
  enableCPUThrottling,
  disableCPUThrottling,
  goOffline,
  MOBILE_USERAGENT: MOTOG4_USERAGENT,
  DESKTOP_USERAGENT,
};
