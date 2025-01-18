/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global globalThis */

import {Buffer} from 'buffer';

import log from 'lighthouse-logger';

import lighthouse, {navigation, startTimespan, snapshot} from '../../core/index.js';
import {lookupLocale} from '../../core/lib/i18n/i18n.js';
import {registerLocaleData, getCanonicalLocales} from '../../shared/localization/format.js';
import * as constants from '../../core/config/constants.js';
import thirdPartyWeb from '../../core/lib/third-party-web.js';

// Rollup seems to overlook some references to `Buffer`, so it must be made explicit.
// (`parseSourceMapFromDataUrl` breaks without this)
/** @type {BufferConstructor} */
globalThis.Buffer = Buffer;

/**
 * Returns a config, which runs only certain categories.
 * Varies the config to use based on device.
 * Counterpart to the CDT code that sets flags.
 * @see https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/lighthouse/LighthouseController.ts;l=280
 * @param {Array<string>} categoryIDs
 * @param {string} device
 * @return {LH.Config}
 */
function createConfig(categoryIDs, device) {
  /** @type {LH.SharedFlagsSettings} */
  const settings = {
    onlyCategories: categoryIDs,
    // In DevTools, emulation is applied _before_ Lighthouse starts (to deal with viewport emulation bugs). go/xcnjf
    // As a result, we don't double-apply viewport emulation.
    screenEmulation: {disabled: true},
    ignoreStatusCode: true,
  };
  if (device === 'desktop') {
    settings.throttling = constants.throttling.desktopDense4G;
    // UA emulation, however, is lost in the protocol handover from devtools frontend to the lighthouse_worker. So it's always applied.
    settings.emulatedUserAgent = constants.userAgents.desktop;
    settings.formFactor = 'desktop';
  }

  return {
    extends: 'lighthouse:default',
    settings,
  };
}

/** @param {(status: [string, string, string]) => void} listenCallback */
function listenForStatus(listenCallback) {
  log.events.addListener('status', listenCallback);
  log.events.addListener('warning', listenCallback);
}

/**
 * Does a locale lookup but limits the result to the *canonical* Lighthouse
 * locales, which are only the locales with a messages locale file that can
 * be downloaded and then used via `registerLocaleData`.
 * @param {string|string[]=} locales
 * @return {LH.Locale}
 */
function lookupCanonicalLocale(locales) {
  return lookupLocale(locales, getCanonicalLocales());
}

// Expose only in DevTools' worker
if (typeof self !== 'undefined') {
  // TODO: refactor and delete `global.isDevtools`.
  global.isDevtools = true;

  // @ts-expect-error
  self.navigation = navigation;
  // @ts-expect-error
  self.startTimespan = startTimespan;
  // @ts-expect-error
  self.snapshot = snapshot;
  // @ts-expect-error
  self.createConfig = createConfig;
  // @ts-expect-error
  self.listenForStatus = listenForStatus;
  // @ts-expect-error
  self.registerLocaleData = registerLocaleData;
  // TODO: expose as lookupCanonicalLocale in LighthouseService.ts?
  // @ts-expect-error
  self.lookupLocale = lookupCanonicalLocale;
  // @ts-expect-error
  self.thirdPartyWeb = thirdPartyWeb;
} else {
  // For the bundle smoke test.
  // @ts-expect-error
  global.runBundledLighthouse = lighthouse;
  // @ts-expect-error
  global.thirdPartyWeb = thirdPartyWeb;
}
