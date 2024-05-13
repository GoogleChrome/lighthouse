/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer-core';
import log from 'lighthouse-logger';

import {Driver} from './driver.js';
import {Runner} from '../runner.js';
import {getEmptyArtifactState, collectPhaseArtifacts, awaitArtifacts} from './runner-helpers.js';
import * as prepare from './driver/prepare.js';
import {gotoURL} from './driver/navigation.js';
import * as storage from './driver/storage.js';
import * as emulation from '../lib/emulation.js';
import {initializeConfig} from '../config/config.js';
import {getBaseArtifacts, finalizeArtifacts} from './base-artifacts.js';
import * as format from '../../shared/localization/format.js';
import {LighthouseError} from '../lib/lh-error.js';
import UrlUtils from '../lib/url-utils.js';
import {getPageLoadError} from '../lib/navigation-error.js';
import Trace from './gatherers/trace.js';
import DevtoolsLog from './gatherers/devtools-log.js';
import {NetworkRecords} from '../computed/network-records.js';

/**
 * @typedef NavigationContext
 * @property {Driver} driver
 * @property {LH.Puppeteer.Page} page
 * @property {LH.Config.ResolvedConfig} resolvedConfig
 * @property {LH.NavigationRequestor} requestor
 * @property {LH.BaseArtifacts} baseArtifacts
 * @property {Map<string, LH.ArbitraryEqualityMap>} computedCache
 */

/** @typedef {Omit<Parameters<typeof collectPhaseArtifacts>[0], 'phase'>} PhaseState */

const DEFAULT_HOSTNAME = '127.0.0.1';
const DEFAULT_PORT = 9222;

/**
 * @param {{driver: Driver, resolvedConfig: LH.Config.ResolvedConfig, requestor: LH.NavigationRequestor}} args
 * @return {Promise<{baseArtifacts: LH.BaseArtifacts}>}
 */
async function _setup({driver, resolvedConfig, requestor}) {
  await driver.connect();

  // We can't trigger the navigation through user interaction if we reset the page before starting.
  if (typeof requestor === 'string' && !resolvedConfig.settings.skipAboutBlank) {
    // Disable network monitor on the blank page to prevent it from picking up network requests and
    // frame navigated events before the run starts.
    await driver._networkMonitor?.disable();

    await gotoURL(driver, resolvedConfig.settings.blankPage, {waitUntil: ['navigated']});

    await driver._networkMonitor?.enable();
  }

  const baseArtifacts = await getBaseArtifacts(resolvedConfig, driver, {gatherMode: 'navigation'});

  const {warnings} =
    await prepare.prepareTargetForNavigationMode(driver, resolvedConfig.settings, requestor);

  baseArtifacts.LighthouseRunWarnings.push(...warnings);

  return {baseArtifacts};
}

/**
 * @param {NavigationContext} navigationContext
 */
async function _cleanupNavigation({driver}) {
  await emulation.clearThrottling(driver.defaultSession);
}

/**
 * @param {NavigationContext} navigationContext
 * @return {Promise<{requestedUrl: string, mainDocumentUrl: string, navigationError: LH.LighthouseError | undefined}>}
 */
async function _navigate(navigationContext) {
  const {driver, resolvedConfig, requestor} = navigationContext;

  try {
    const {requestedUrl, mainDocumentUrl, warnings} = await gotoURL(driver, requestor, {
      ...resolvedConfig.settings,
      waitUntil: resolvedConfig.settings.pauseAfterFcpMs ? ['fcp', 'load'] : ['load'],
    });

    navigationContext.baseArtifacts.LighthouseRunWarnings.push(...warnings);

    return {requestedUrl, mainDocumentUrl, navigationError: undefined};
  } catch (err) {
    if (!(err instanceof LighthouseError)) throw err;
    if (err.code !== 'NO_FCP' && err.code !== 'PAGE_HUNG' && err.code !== 'TARGET_CRASHED') {
      throw err;
    }
    if (typeof requestor !== 'string') throw err;

    // TODO: Make the urls optional here so we don't need to throw an error with a callback requestor.
    return {
      requestedUrl: requestor,
      mainDocumentUrl: requestor,
      navigationError: err,
    };
  }
}

/**
 * @param {NavigationContext} navigationContext
 * @param {PhaseState} phaseState
 * @return {Promise<{devtoolsLog?: LH.DevtoolsLog, records?: Array<LH.Artifacts.NetworkRequest>, trace?: LH.Trace}>}
 */
async function _collectDebugData(navigationContext, phaseState) {
  let devtoolsLog;
  let trace;

  for (const definition of phaseState.artifactDefinitions) {
    const {instance} = definition.gatherer;
    if (instance instanceof DevtoolsLog) {
      devtoolsLog = instance.getDebugData();
    } else if (instance instanceof Trace) {
      trace = instance.getDebugData();
    }
  }

  const records = devtoolsLog && (await NetworkRecords.request(devtoolsLog, navigationContext));

  return {devtoolsLog, records, trace};
}

/**
 * @param {NavigationContext} navigationContext
 * @param {PhaseState} phaseState
 * @param {Awaited<ReturnType<typeof _navigate>>} navigateResult
 * @return {Promise<Partial<LH.GathererArtifacts>>}
 */
async function _computeNavigationResult(
  navigationContext,
  phaseState,
  navigateResult
) {
  const {navigationError, requestedUrl, mainDocumentUrl} = navigateResult;
  const debugData = await _collectDebugData(navigationContext, phaseState);
  const pageLoadError = debugData.records
    ? getPageLoadError(navigationError, {
      url: mainDocumentUrl,
      ignoreStatusCode: navigationContext.resolvedConfig.settings.ignoreStatusCode,
      networkRecords: debugData.records,
      warnings: navigationContext.baseArtifacts.LighthouseRunWarnings,
    })
    : navigationError;

  if (pageLoadError) {
    const locale = navigationContext.resolvedConfig.settings.locale;
    const localizedMessage = format.getFormatted(pageLoadError.friendlyMessage, locale);
    log.error('NavigationRunner', localizedMessage, requestedUrl);

    /** @type {Partial<LH.GathererArtifacts>} */
    const artifacts = {};
    const pageLoadErrorId = 'pageLoadError-defaultPass';
    if (debugData.devtoolsLog) {
      artifacts.DevtoolsLogError = debugData.devtoolsLog;
      artifacts.devtoolsLogs = {[pageLoadErrorId]: debugData.devtoolsLog};
    }
    if (debugData.trace) {
      artifacts.TraceError = debugData.trace;
      artifacts.traces = {[pageLoadErrorId]: debugData.trace};
    }

    navigationContext.baseArtifacts.LighthouseRunWarnings.push(pageLoadError.friendlyMessage);
    navigationContext.baseArtifacts.PageLoadError = pageLoadError;

    return artifacts;
  } else {
    await collectPhaseArtifacts({phase: 'getArtifact', ...phaseState});

    return await awaitArtifacts(phaseState.artifactState);
  }
}

/**
 * @param {NavigationContext} navigationContext
 * @return {ReturnType<typeof _computeNavigationResult>}
 */
async function _navigation(navigationContext) {
  if (!navigationContext.resolvedConfig.artifacts) {
    throw new Error('No artifacts were defined on the config');
  }

  const artifactState = getEmptyArtifactState();
  const phaseState = {
    url: await navigationContext.driver.url(),
    gatherMode: /** @type {const} */ ('navigation'),
    driver: navigationContext.driver,
    page: navigationContext.page,
    computedCache: navigationContext.computedCache,
    artifactDefinitions: navigationContext.resolvedConfig.artifacts,
    artifactState,
    baseArtifacts: navigationContext.baseArtifacts,
    settings: navigationContext.resolvedConfig.settings,
  };

  const disableAsyncStacks =
    await prepare.enableAsyncStacks(navigationContext.driver.defaultSession);

  await collectPhaseArtifacts({phase: 'startInstrumentation', ...phaseState});
  await collectPhaseArtifacts({phase: 'startSensitiveInstrumentation', ...phaseState});
  const navigateResult = await _navigate(navigationContext);

  // Every required url is initialized to an empty string in `getBaseArtifacts`.
  // If we haven't set all the required urls yet, set them here.
  if (!Object.values(phaseState.baseArtifacts.URL).every(Boolean)) {
    phaseState.baseArtifacts.URL = {
      requestedUrl: navigateResult.requestedUrl,
      mainDocumentUrl: navigateResult.mainDocumentUrl,
      finalDisplayedUrl: await navigationContext.driver.url(),
    };
  }
  phaseState.url = navigateResult.mainDocumentUrl;

  await collectPhaseArtifacts({phase: 'stopSensitiveInstrumentation', ...phaseState});
  await collectPhaseArtifacts({phase: 'stopInstrumentation', ...phaseState});

  // bf-cache-failures can emit `Page.frameNavigated` at the end of the run.
  // This can cause us to issue protocol commands after the target closes.
  // We should disable our `Page.frameNavigated` handlers before that.
  await disableAsyncStacks();

  await _cleanupNavigation(navigationContext);

  return _computeNavigationResult(navigationContext, phaseState, navigateResult);
}

/**
 * @param {{requestedUrl?: string, driver: Driver, resolvedConfig: LH.Config.ResolvedConfig, lhBrowser?: LH.Puppeteer.Browser, lhPage?: LH.Puppeteer.Page}} args
 */
async function _cleanup({requestedUrl, driver, resolvedConfig, lhBrowser, lhPage}) {
  const didResetStorage = !resolvedConfig.settings.disableStorageReset && requestedUrl;
  if (didResetStorage) {
    await storage.clearDataForOrigin(driver.defaultSession,
    requestedUrl,
    resolvedConfig.settings.clearStorageTypes
    );
  }

  await driver.disconnect();

  // If Lighthouse started the Puppeteer instance then we are responsible for closing it.
  await lhPage?.close();
  await lhBrowser?.disconnect();
}

/**
 * @param {LH.Puppeteer.Page|undefined} page
 * @param {LH.NavigationRequestor|undefined} requestor
 * @param {{config?: LH.Config, flags?: LH.Flags}} [options]
 * @return {Promise<LH.Gatherer.GatherResult>}
 */
async function navigationGather(page, requestor, options = {}) {
  const {flags = {}, config} = options;
  log.setLevel(flags.logLevel || 'error');

  const {resolvedConfig} = await initializeConfig('navigation', config, flags);
  const computedCache = new Map();

  const isCallback = typeof requestor === 'function';

  const runnerOptions = {resolvedConfig, computedCache};

  const gatherFn = async () => {
    const normalizedRequestor = isCallback ? requestor : UrlUtils.normalizeUrl(requestor);

    /** @type {LH.Puppeteer.Browser|undefined} */
    let lhBrowser = undefined;
    /** @type {LH.Puppeteer.Page|undefined} */
    let lhPage = undefined;

    // For navigation mode, we shouldn't connect to a browser in audit mode,
    // therefore we connect to the browser in the gatherFn callback.
    if (!page) {
      const {hostname = DEFAULT_HOSTNAME, port = DEFAULT_PORT} = flags;
      lhBrowser = await puppeteer.connect({browserURL: `http://${hostname}:${port}`, defaultViewport: null});
      lhPage = await lhBrowser.newPage();
      page = lhPage;
    }

    const driver = new Driver(page);
    const context = {
      driver,
      lhBrowser,
      lhPage,
      page,
      resolvedConfig,
      requestor: normalizedRequestor,
      computedCache,
    };
    const {baseArtifacts} = await _setup(context);

    const artifacts = await _navigation({...context, baseArtifacts});

    await _cleanup(context);

    return finalizeArtifacts(baseArtifacts, artifacts);
  };
  const artifacts = await Runner.gather(gatherFn, runnerOptions);
  return {artifacts, runnerOptions};
}

export {
  navigationGather,
  _setup,
  _navigate,
  _navigation,
  _cleanup,
};
