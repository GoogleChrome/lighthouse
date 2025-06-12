/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {waitForFullyLoaded, waitForFrameNavigated, waitForUserToContinue} from './wait-for-condition.js';
import * as constants from '../../config/constants.js';
import * as i18n from '../../lib/i18n/i18n.js';
import UrlUtils from '../../lib/url-utils.js';

const UIStrings = {
  /**
   * @description Warning that the web page redirected during testing and that may have affected the load.
   * @example {https://example.com/requested/page} requested
   * @example {https://example.com/final/resolved/page} final
   */
  warningRedirected: 'The page may not be loading as expected because your test URL ' +
  `({requested}) was redirected to {final}. ` +
  'Try testing the second URL directly.',
  /**
   * @description Warning that Lighthouse timed out while waiting for the page to load.
   */
  warningTimeout: 'The page loaded too slowly to finish within the time limit. ' +
  'Results may be incomplete.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);


// Controls how long to wait after FCP before continuing
const DEFAULT_PAUSE_AFTER_FCP = 0;
// Controls how long to wait after onLoad before continuing
const DEFAULT_PAUSE_AFTER_LOAD = 0;
// Controls how long to wait between network requests before determining the network is quiet
const DEFAULT_NETWORK_QUIET_THRESHOLD = 5000;
// Controls how long to wait between longtasks before determining the CPU is idle, off by default
const DEFAULT_CPU_QUIET_THRESHOLD = 0;

/** @typedef {{waitUntil: Array<'fcp'|'load'|'navigated'>} & Partial<LH.Config.Settings>} NavigationOptions */

/** @param {NavigationOptions} options */
function resolveWaitForFullyLoadedOptions(options) {
  let {pauseAfterFcpMs, pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs} = options;
  let maxWaitMs = options.maxWaitForLoad;
  let maxFCPMs = options.maxWaitForFcp;

  if (typeof pauseAfterFcpMs !== 'number') pauseAfterFcpMs = DEFAULT_PAUSE_AFTER_FCP;
  if (typeof pauseAfterLoadMs !== 'number') pauseAfterLoadMs = DEFAULT_PAUSE_AFTER_LOAD;
  if (typeof networkQuietThresholdMs !== 'number') {
    networkQuietThresholdMs = DEFAULT_NETWORK_QUIET_THRESHOLD;
  }
  if (typeof cpuQuietThresholdMs !== 'number') cpuQuietThresholdMs = DEFAULT_CPU_QUIET_THRESHOLD;
  if (typeof maxWaitMs !== 'number') maxWaitMs = constants.defaultSettings.maxWaitForLoad;
  if (typeof maxFCPMs !== 'number') maxFCPMs = constants.defaultSettings.maxWaitForFcp;

  if (!options.waitUntil.includes('fcp')) maxFCPMs = undefined;

  return {
    pauseAfterFcpMs,
    pauseAfterLoadMs,
    networkQuietThresholdMs,
    cpuQuietThresholdMs,
    maxWaitForLoadedMs: maxWaitMs,
    maxWaitForFcpMs: maxFCPMs,
  };
}

/**
 * Navigates to the given URL, assuming that the page is not already on this URL.
 * Resolves on the url of the loaded page, taking into account any redirects.
 * Typical use of this method involves navigating to a neutral page such as `about:blank` in between
 * navigations.
 *
 * @param {LH.Gatherer.Driver} driver
 * @param {LH.NavigationRequestor} requestor
 * @param {NavigationOptions} options
 * @return {Promise<{requestedUrl: string, mainDocumentUrl: string, warnings: Array<LH.IcuMessage>}>}
 */
async function gotoURL(driver, requestor, options) {
  const status = typeof requestor === 'string' ?
    {msg: `Navigating to ${requestor}`, id: 'lh:driver:navigate'} :
    {msg: 'Navigating using a user defined function', id: 'lh:driver:navigate'};
  log.time(status);

  const session = driver.defaultSession;
  const networkMonitor = driver.networkMonitor;

  // Enable the events and network monitor needed to track navigation progress.
  await session.sendCommand('Page.enable');
  await session.sendCommand('Page.setLifecycleEventsEnabled', {enabled: true});

  let waitForNavigationTriggered;
  if (typeof requestor === 'string') {
    // No timeout needed for Page.navigate. See https://github.com/GoogleChrome/lighthouse/pull/6413
    session.setNextProtocolTimeout(Infinity);
    waitForNavigationTriggered = session.sendCommand('Page.navigate', {url: requestor});
  } else {
    waitForNavigationTriggered = requestor();
  }

  const waitForNavigated = options.waitUntil.includes('navigated');
  const waitForLoad = options.waitUntil.includes('load');
  const waitForFcp = options.waitUntil.includes('fcp');

  /** @type {Array<Promise<{timedOut: boolean}>>} */
  const waitConditionPromises = [];

  if (waitForNavigated) {
    const navigatedPromise = waitForFrameNavigated(session).promise;
    waitConditionPromises.push(navigatedPromise.then(() => ({timedOut: false})));
  }

  if (waitForLoad) {
    const waitOptions = resolveWaitForFullyLoadedOptions(options);
    waitConditionPromises.push(waitForFullyLoaded(session, networkMonitor, waitOptions));
  } else if (waitForFcp) {
    throw new Error('Cannot wait for FCP without waiting for page load');
  }

  const waitConditions = await Promise.race([
    session.onCrashPromise(),
    Promise.all(waitConditionPromises),
  ]);
  const timedOut = waitConditions.some(condition => condition.timedOut);
  const navigationUrls = await networkMonitor.getNavigationUrls();

  let requestedUrl = navigationUrls.requestedUrl;
  if (typeof requestor === 'string') {
    if (requestedUrl && !UrlUtils.equalWithExcludedFragments(requestor, requestedUrl)) {
      log.error(
        'Navigation',
        `Provided URL (${requestor}) did not match initial navigation URL (${requestedUrl})`
      );
    }
    requestedUrl = requestor;
  }
  if (!requestedUrl) throw Error('No navigations detected when running user defined requestor.');

  const mainDocumentUrl = navigationUrls.mainDocumentUrl || requestedUrl;

  // Bring `Page.navigate` errors back into the promise chain. See https://github.com/GoogleChrome/lighthouse/pull/6739.
  await waitForNavigationTriggered;

  if (options.debugNavigation) {
    await waitForUserToContinue(driver);
  }

  log.timeEnd(status);
  return {
    requestedUrl,
    mainDocumentUrl,
    warnings: getNavigationWarnings({timedOut, mainDocumentUrl, requestedUrl}),
  };
}

/**
 * @param {{timedOut: boolean, requestedUrl: string, mainDocumentUrl: string; }} navigation
 * @return {Array<LH.IcuMessage>}
 */
function getNavigationWarnings(navigation) {
  const {requestedUrl, mainDocumentUrl} = navigation;
  /** @type {Array<LH.IcuMessage>} */
  const warnings = [];

  if (navigation.timedOut) warnings.push(str_(UIStrings.warningTimeout));

  if (!UrlUtils.equalWithExcludedFragments(requestedUrl, mainDocumentUrl)) {
    warnings.push(str_(UIStrings.warningRedirected, {
      requested: requestedUrl,
      final: mainDocumentUrl,
    }));
  }

  return warnings;
}

export {gotoURL, getNavigationWarnings, UIStrings};
