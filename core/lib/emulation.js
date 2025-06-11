/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const NO_THROTTLING_METRICS = {
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
  offline: false,
};

const NO_CPU_THROTTLE_METRICS = {
  rate: 1,
};

/**
 * @param {string} userAgent
 * @param {LH.Config.Settings['formFactor']} formFactor
 * @return {LH.Crdp.Emulation.SetUserAgentOverrideRequest['userAgentMetadata']}
 */
function parseUseragentIntoMetadata(userAgent, formFactor) {
  const match = userAgent.match(/Chrome\/([\d.]+)/); // eg 'Chrome/(71.0.3577.0)'
  const fullVersion = match?.[1] || '99.0.1234.0';
  const [version] = fullVersion.split('.', 1);
  const brands = [
    {brand: 'Chromium', version},
    {brand: 'Google Chrome', version},
  ];

  const motoGPowerDetails = {
    platform: 'Android',
    platformVersion: '11.0',
    architecture: '',
    model: 'moto g power (2022)',
  };
  const macDesktopDetails = {
    platform: 'macOS',
    platformVersion: '10.15.7',
    architecture: 'x86',
    model: '',
  };
  const mobile = formFactor === 'mobile';

  return {
    brands,
    fullVersion,
    // Since config users can supply a custom useragent, they likely are emulating something
    // other than Moto G Power and MacOS Desktop.
    // TODO: Determine how to thoughtfully expose this metadata/client-hints configurability.
    ...(mobile ? motoGPowerDetails : macDesktopDetails),
    mobile,
  };
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {LH.Config.Settings} settings
 * @return {Promise<void>}
 */
async function emulate(session, settings) {
  if (settings.emulatedUserAgent !== false) {
    const userAgent = /** @type {string} */ (settings.emulatedUserAgent);
    await session.sendCommand('Network.setUserAgentOverride', {
      userAgent,
      userAgentMetadata: parseUseragentIntoMetadata(userAgent, settings.formFactor),
    });
  }
  // See devtools-entry for one usecase for disabling screenEmulation
  if (settings.screenEmulation.disabled !== true) {
    const {width, height, deviceScaleFactor, mobile} = settings.screenEmulation;
    const params = {width, height, deviceScaleFactor, mobile};
    await session.sendCommand('Emulation.setDeviceMetricsOverride', params);
    await session.sendCommand('Emulation.setTouchEmulationEnabled', {
      enabled: params.mobile,
    });
  }
}

/**
 * Sets the throttling options specified in config settings, clearing existing network throttling if
 * throttlingMethod is not `devtools` (but not CPU throttling, suspected requirement of WPT-compat).
 *
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {LH.Config.Settings} settings
 * @return {Promise<void>}
 */
async function throttle(session, settings) {
  if (settings.throttlingMethod !== 'devtools') return clearNetworkThrottling(session);

  await Promise.all([
    enableNetworkThrottling(session, settings.throttling),
    enableCPUThrottling(session, settings.throttling),
  ]);
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {Promise<void>}
 */
async function clearThrottling(session) {
  await Promise.all([clearNetworkThrottling(session), clearCPUThrottling(session)]);
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {Required<LH.ThrottlingSettings>} throttlingSettings
 * @return {Promise<void>}
 */
function enableNetworkThrottling(session, throttlingSettings) {
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
  return session.sendCommand('Network.emulateNetworkConditions', conditions);
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {Promise<void>}
 */
function clearNetworkThrottling(session) {
  return session.sendCommandAndIgnore('Network.emulateNetworkConditions', NO_THROTTLING_METRICS);
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {Required<LH.ThrottlingSettings>} throttlingSettings
 * @return {Promise<void>}
 */
function enableCPUThrottling(session, throttlingSettings) {
  const rate = throttlingSettings.cpuSlowdownMultiplier;
  return session.sendCommand('Emulation.setCPUThrottlingRate', {rate});
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {Promise<void>}
 */
function clearCPUThrottling(session) {
  return session.sendCommandAndIgnore('Emulation.setCPUThrottlingRate', NO_CPU_THROTTLE_METRICS);
}

export {
  emulate,
  throttle,
  clearThrottling,
  enableNetworkThrottling,
  clearNetworkThrottling,
  enableCPUThrottling,
  clearCPUThrottling,
};
