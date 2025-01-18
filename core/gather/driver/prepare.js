/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import * as storage from './storage.js';
import * as emulation from '../../lib/emulation.js';
import {pageFunctions} from '../../lib/page-functions.js';

/**
 * Enables `Debugger` domain to receive async stacktrace information on network request initiators.
 * This is critical for tracking attribution of tasks and performance simulation accuracy.
 * @param {LH.Gatherer.ProtocolSession} session
 */
async function enableAsyncStacks(session) {
  const enable = async () => {
    await session.sendCommand('Debugger.enable');
    await session.sendCommand('Debugger.setSkipAllPauses', {skip: true});
    await session.sendCommand('Debugger.setAsyncCallStackDepth', {maxDepth: 8});
  };

  /**
   * Resume any pauses that make it through `setSkipAllPauses`
   */
  function onDebuggerPaused() {
    session.sendCommand('Debugger.resume');
  }

  /**
   * `Debugger.setSkipAllPauses` is reset after every navigation, so retrigger it on main frame navigations.
   * See https://bugs.chromium.org/p/chromium/issues/detail?id=990945&q=setSkipAllPauses&can=2
   * @param {LH.Crdp.Page.FrameNavigatedEvent} event
   */
  function onFrameNavigated(event) {
    if (event.frame.parentId) return;
    enable().catch(err => log.error('Driver', err));
  }

  session.on('Debugger.paused', onDebuggerPaused);
  session.on('Page.frameNavigated', onFrameNavigated);

  await enable();

  return async () => {
    await session.sendCommandAndIgnore('Debugger.disable');
    session.off('Debugger.paused', onDebuggerPaused);
    session.off('Page.frameNavigated', onFrameNavigated);
  };
}

/**
 * Use a RequestIdleCallback shim for tests run with simulated throttling, so that the deadline can be used without
 * a penalty.
 * @param {LH.Gatherer.Driver} driver
 * @param {LH.Config.Settings} settings
 * @return {Promise<void>}
 */
async function shimRequestIdleCallbackOnNewDocument(driver, settings) {
  await driver.executionContext.evaluateOnNewDocument(pageFunctions.wrapRequestIdleCallback, {
    args: [settings.throttling.cpuSlowdownMultiplier],
  });
}

/**
 * Dismiss JavaScript dialogs (alert, confirm, prompt), providing a
 * generic promptText in case the dialog is a prompt.
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {Promise<void>}
 */
async function dismissJavaScriptDialogs(session) {
  session.on('Page.javascriptDialogOpening', data => {
    log.warn('Driver', `${data.type} dialog opened by the page automatically suppressed.`);

    session
      .sendCommand('Page.handleJavaScriptDialog', {
        accept: true,
        promptText: 'Lighthouse prompt response',
      })
      .catch(err => log.warn('Driver', err));
  });

  await session.sendCommand('Page.enable');
}

/**
 * Reset the storage and warn if any stored data could be affecting the scores.
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {string} url
 * @param {LH.Config.Settings['clearStorageTypes']} clearStorageTypes
 * @return {Promise<{warnings: Array<LH.IcuMessage>}>}
 */
async function resetStorageForUrl(session, url, clearStorageTypes) {
  /** @type {Array<LH.IcuMessage>} */
  const warnings = [];

  const clearDataWarnings = await storage.clearDataForOrigin(session, url, clearStorageTypes);
  warnings.push(...clearDataWarnings);

  const clearCacheWarnings = await storage.clearBrowserCaches(session);
  warnings.push(...clearCacheWarnings);

  const importantStorageWarning = await storage.getImportantStorageWarning(session, url);
  if (importantStorageWarning) warnings.push(importantStorageWarning);

  return {warnings};
}

/**
 * Prepares a target for observational analysis by setting throttling and network headers/blocked patterns.
 *
 * This method assumes `prepareTargetForNavigationMode` or `prepareTargetForTimespanMode` has already been invoked.
 *
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {LH.Config.Settings} settings
 */
async function prepareThrottlingAndNetwork(session, settings) {
  const status = {msg: 'Preparing network conditions', id: `lh:gather:prepareThrottlingAndNetwork`};
  log.time(status);

  await emulation.throttle(session, settings);

  // Set request blocking before any network activity.
  // No "clearing" is done at the end of the recording since Network.setBlockedURLs([]) will unset all if
  // neccessary at the beginning of the next section.
  const blockedUrls = settings.blockedUrlPatterns || [];
  await session.sendCommand('Network.setBlockedURLs', {urls: blockedUrls});

  const headers = settings.extraHeaders;
  if (headers) await session.sendCommand('Network.setExtraHTTPHeaders', {headers});

  log.timeEnd(status);
}

/**
 * Prepares a target to be analyzed by setting up device emulation (screen/UA, not throttling) and
 * async stack traces for network initiators.
 *
 * @param {LH.Gatherer.Driver} driver
 * @param {LH.Config.Settings} settings
 */
async function prepareDeviceEmulation(driver, settings) {
  // Enable network domain here so future calls to `emulate()` don't clear cache (https://github.com/GoogleChrome/lighthouse/issues/12631)
  await driver.defaultSession.sendCommand('Network.enable');

  // Emulate our target device screen and user agent.
  await emulation.emulate(driver.defaultSession, settings);
}

/**
 * Prepares a target to be analyzed in timespan mode by enabling protocol domains, emulation, and throttling.
 *
 * @param {LH.Gatherer.Driver} driver
 * @param {LH.Config.Settings} settings
 */
async function prepareTargetForTimespanMode(driver, settings) {
  const status = {msg: 'Preparing target for timespan mode', id: 'lh:prepare:timespanMode'};
  log.time(status);

  await prepareDeviceEmulation(driver, settings);
  await prepareThrottlingAndNetwork(driver.defaultSession, settings);
  await warmUpIntlSegmenter(driver);

  log.timeEnd(status);
}

/**
 * Ensure the `Intl.Segmenter` created in `pageFunctions.truncate` is cached by v8 before
 * recording the trace begins.
 *
 * @param {LH.Gatherer.Driver} driver
 */
async function warmUpIntlSegmenter(driver) {
  await driver.executionContext.evaluate(pageFunctions.truncate, {
    args: ['aaa', 2],
  });
}

/**
 * Prepares a target to be analyzed in navigation mode by enabling protocol domains, emulation, and new document
 * handlers for global APIs or error handling.
 *
 * This method should be used in combination with `prepareTargetForIndividualNavigation` before a specific navigation occurs.
 *
 * @param {LH.Gatherer.Driver} driver
 * @param {LH.Config.Settings} settings
 * @param {LH.NavigationRequestor} requestor
 * @return {Promise<{warnings: Array<LH.IcuMessage>}>}
 */
async function prepareTargetForNavigationMode(driver, settings, requestor) {
  const status = {msg: 'Preparing target for navigation mode', id: 'lh:prepare:navigationMode'};
  log.time(status);

  /** @type {Array<LH.IcuMessage>} */
  const warnings = [];

  await prepareDeviceEmulation(driver, settings);

  // Automatically handle any JavaScript dialogs to prevent a hung renderer.
  await dismissJavaScriptDialogs(driver.defaultSession);

  // Inject our snippet to cache important web platform APIs before they're (possibly) ponyfilled by the page.
  await driver.executionContext.cacheNativesOnNewDocument();

  // Wrap requestIdleCallback so pages under simulation receive the correct rIC deadlines.
  if (settings.throttlingMethod === 'simulate') {
    await shimRequestIdleCallbackOnNewDocument(driver, settings);
  }

  await warmUpIntlSegmenter(driver);

  const shouldResetStorage =
    !settings.disableStorageReset &&
    // Without prior knowledge of the destination, we cannot know which URL to clear storage for.
    typeof requestor === 'string';
  if (shouldResetStorage) {
    const {warnings: storageWarnings} = await resetStorageForUrl(driver.defaultSession,
      requestor,
      settings.clearStorageTypes);
    warnings.push(...storageWarnings);
  }

  await prepareThrottlingAndNetwork(driver.defaultSession, settings);

  log.timeEnd(status);

  return {warnings};
}

export {
  prepareThrottlingAndNetwork,
  prepareTargetForTimespanMode,
  prepareTargetForNavigationMode,
  enableAsyncStacks,
};
