/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const isDeepEqual = require('lodash.isequal');
const log = require('lighthouse-logger');
const NetworkRecords = require('../computed/network-records.js');
const {getPageLoadError} = require('../lib/navigation-error.js');
const emulation = require('../lib/emulation.js');
const constants = require('../config/constants.js');
const i18n = require('../lib/i18n/i18n.js');
const {getBenchmarkIndex, getEnvironmentWarnings} = require('./driver/environment.js');
const prepare = require('./driver/prepare.js');
const storage = require('./driver/storage.js');
const navigation = require('./driver/navigation.js');
const serviceWorkers = require('./driver/service-workers.js');
const WebAppManifest = require('./gatherers/web-app-manifest.js');
const InstallabilityErrors = require('./gatherers/installability-errors.js');
const NetworkUserAgent = require('./gatherers/network-user-agent.js');
const Stacks = require('./gatherers/stacks.js');

/** @typedef {import('../gather/driver.js')} Driver */
/** @typedef {import('../lib/arbitrary-equality-map.js')} ArbitraryEqualityMap */

/**
 * Each entry in each gatherer result array is the output of a gatherer phase:
 * `beforePass`, `pass`, and `afterPass`. Flattened into an `LH.Artifacts` in
 * `collectArtifacts`.
 * @typedef {Record<keyof LH.GathererArtifacts, Array<LH.Gatherer.PhaseResult>>} GathererResults
 */
/** @typedef {Array<[keyof GathererResults, GathererResults[keyof GathererResults]]>} GathererResultsEntries */

/**
 * Class that drives browser to load the page and runs gatherer lifecycle hooks.
 */
class GatherRunner {
  /**
   * Loads about:blank and waits there briefly. Since a Page.reload command does
   * not let a service worker take over, we navigate away and then come back to
   * reload. We do not `waitForLoad` on about:blank since a page load event is
   * never fired on it.
   * @param {Driver} driver
   * @param {string=} url
   * @return {Promise<void>}
   */
  static async loadBlank(driver, url = constants.defaultPassConfig.blankPage) {
    const status = {msg: 'Resetting state with about:blank', id: 'lh:gather:loadBlank'};
    log.time(status);
    await navigation.gotoURL(driver, url, {waitUntil: ['navigated']});
    log.timeEnd(status);
  }

  /**
   * Loads options.url with specified options. If the main document URL
   * redirects, options.url will be updated accordingly. As such, options.url
   * will always represent the post-redirected URL. options.requestedUrl is the
   * pre-redirect starting URL. If the navigation errors with "expected" errors such as
   * NO_FCP, a `navigationError` is returned.
   * @param {Driver} driver
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<{navigationError?: LH.LighthouseError}>}
   */
  static async loadPage(driver, passContext) {
    const status = {
      msg: 'Loading page & waiting for onload',
      id: `lh:gather:loadPage-${passContext.passConfig.passName}`,
    };
    log.time(status);
    try {
      const requestedUrl = passContext.url;
      const {finalUrl, warnings} = await navigation.gotoURL(driver, requestedUrl, {
        waitUntil: passContext.passConfig.recordTrace ?
          ['load', 'fcp'] : ['load'],
        maxWaitForFcp: passContext.settings.maxWaitForFcp,
        maxWaitForLoad: passContext.settings.maxWaitForLoad,
        ...passContext.passConfig,
      });
      passContext.url = finalUrl;
      if (passContext.passConfig.loadFailureMode === 'fatal') {
        passContext.LighthouseRunWarnings.push(...warnings);
      }
    } catch (err) {
      // If it's one of our loading-based LHErrors, we'll treat it as a page load error.
      if (err.code === 'NO_FCP' || err.code === 'PAGE_HUNG') {
        return {navigationError: err};
      }

      throw err;
    } finally {
      log.timeEnd(status);
    }

    return {};
  }

  /**
   * Rejects if any open tabs would share a service worker with the target URL.
   * This includes the target tab, so navigation to something like about:blank
   * should be done before calling.
   * @param {LH.Gatherer.FRProtocolSession} session
   * @param {string} pageUrl
   * @return {Promise<void>}
   */
  static assertNoSameOriginServiceWorkerClients(session, pageUrl) {
    /** @type {Array<LH.Crdp.ServiceWorker.ServiceWorkerRegistration>} */
    let registrations;
    /** @type {Array<LH.Crdp.ServiceWorker.ServiceWorkerVersion>} */
    let versions;

    return serviceWorkers.getServiceWorkerRegistrations(session)
      .then(data => {
        registrations = data.registrations;
      })
      .then(_ => serviceWorkers.getServiceWorkerVersions(session))
      .then(data => {
        versions = data.versions;
      })
      .then(_ => {
        const origin = new URL(pageUrl).origin;

        registrations
          .filter(reg => {
            const swOrigin = new URL(reg.scopeURL).origin;

            return origin === swOrigin;
          })
          .forEach(reg => {
            versions.forEach(ver => {
              // Ignore workers unaffiliated with this registration
              if (ver.registrationId !== reg.registrationId) {
                return;
              }

              // Throw if service worker for this origin has active controlledClients.
              if (ver.controlledClients && ver.controlledClients.length > 0) {
                throw new Error('You probably have multiple tabs open to the same origin.');
              }
            });
          });
      });
  }

  /**
   * @param {Driver} driver
   * @param {{requestedUrl: string, settings: LH.Config.Settings}} options
   * @return {Promise<void>}
   */
  static async setupDriver(driver, options) {
    const status = {msg: 'Initializing…', id: 'lh:gather:setupDriver'};
    log.time(status);
    const session = driver.defaultSession;

    // Assert no service workers are still installed, so we test that they would actually be installed for a new user.
    // TODO(FR-COMPAT): re-evaluate the necessity of this check
    await GatherRunner.assertNoSameOriginServiceWorkerClients(session, options.requestedUrl);

    await prepare.prepareTargetForNavigationMode(driver, options.settings);

    log.timeEnd(status);
  }

  /**
   * Reset browser state where needed and release the connection.
   * @param {Driver} driver
   * @param {{requestedUrl: string, settings: LH.Config.Settings}} options
   * @return {Promise<void>}
   */
  static async disposeDriver(driver, options) {
    const status = {msg: 'Disconnecting from browser...', id: 'lh:gather:disconnect'};

    log.time(status);
    try {
      // If storage was cleared for the run, clear at the end so Lighthouse specifics aren't cached.
      const session = driver.defaultSession;
      const resetStorage = !options.settings.disableStorageReset;
      if (resetStorage) await storage.clearDataForOrigin(session, options.requestedUrl);

      // Disable fetcher, in case a gatherer enabled it.
      // This cleanup should be removed once the only usage of
      // fetcher (fetching arbitrary URLs) is replaced by new protocol support.
      await driver.fetcher.disable();

      await driver.disconnect();
    } catch (err) {
      // Ignore disconnecting error if browser was already closed.
      // See https://github.com/GoogleChrome/lighthouse/issues/1583
      if (!(/close\/.*status: (500|404)$/.test(err.message))) {
        log.error('GatherRunner disconnect', err.message);
      }
    }
    log.timeEnd(status);
  }

  /**
   * Beging recording devtoolsLog and trace (if requested).
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<void>}
   */
  static async beginRecording(passContext) {
    const status = {msg: 'Beginning devtoolsLog and trace', id: 'lh:gather:beginRecording'};
    log.time(status);

    const {driver, passConfig, settings} = passContext;

    // Always record devtoolsLog
    await driver.beginDevtoolsLog();

    if (passConfig.recordTrace) {
      await driver.beginTrace(settings);
    }

    log.timeEnd(status);
  }

  /**
   * End recording devtoolsLog and trace (if requested), returning an
   * `LH.Gatherer.LoadData` with the recorded data.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Gatherer.LoadData>}
   */
  static async endRecording(passContext) {
    const {driver, passConfig} = passContext;

    let trace;
    if (passConfig.recordTrace) {
      const status = {msg: 'Gathering trace', id: `lh:gather:getTrace`};
      log.time(status);
      trace = await driver.endTrace();
      log.timeEnd(status);
    }

    const status = {
      msg: 'Gathering devtoolsLog & network records',
      id: `lh:gather:getDevtoolsLog`,
    };
    log.time(status);
    const devtoolsLog = driver.endDevtoolsLog();
    const networkRecords = await NetworkRecords.request(devtoolsLog, passContext);
    log.timeEnd(status);

    return {
      networkRecords,
      devtoolsLog,
      trace,
    };
  }

  /**
   * Run beforePass() on gatherers.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {Partial<GathererResults>} gathererResults
   * @return {Promise<void>}
   */
  static async beforePass(passContext, gathererResults) {
    const bpStatus = {msg: `Running beforePass methods`, id: `lh:gather:beforePass`};
    log.time(bpStatus, 'verbose');

    for (const gathererDefn of passContext.passConfig.gatherers) {
      const gatherer = gathererDefn.instance;
      const status = {
        msg: `Gathering setup: ${gatherer.name}`,
        id: `lh:gather:beforePass:${gatherer.name}`,
      };
      log.time(status, 'verbose');
      const artifactPromise = Promise.resolve().then(_ => gatherer.beforePass(passContext));
      gathererResults[gatherer.name] = [artifactPromise];
      await artifactPromise.catch(() => {});
      log.timeEnd(status);
    }
    log.timeEnd(bpStatus);
  }

  /**
   * Run pass() on gatherers.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {Partial<GathererResults>} gathererResults
   * @return {Promise<void>}
   */
  static async pass(passContext, gathererResults) {
    const config = passContext.passConfig;
    const gatherers = config.gatherers;

    const pStatus = {msg: `Running pass methods`, id: `lh:gather:pass`};
    log.time(pStatus, 'verbose');

    for (const gathererDefn of gatherers) {
      const gatherer = gathererDefn.instance;
      const status = {
        msg: `Gathering in-page: ${gatherer.name}`,
        id: `lh:gather:pass:${gatherer.name}`,
      };
      log.time(status);
      const artifactPromise = Promise.resolve().then(_ => gatherer.pass(passContext));

      const gathererResult = gathererResults[gatherer.name] || [];
      gathererResult.push(artifactPromise);
      gathererResults[gatherer.name] = gathererResult;
      await artifactPromise.catch(() => {});
    }

    log.timeEnd(pStatus);
  }

  /**
   * Run afterPass() on gatherers.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @param {Partial<GathererResults>} gathererResults
   * @return {Promise<void>}
   */
  static async afterPass(passContext, loadData, gathererResults) {
    const driver = passContext.driver;
    const config = passContext.passConfig;
    const gatherers = config.gatherers;

    const apStatus = {msg: `Running afterPass methods`, id: `lh:gather:afterPass`};
    log.time(apStatus, 'verbose');

    // Some gatherers scroll the page which can cause unexpected results for other gatherers.
    // We reset the scroll position in between each gatherer.
    const scrollPosition = await driver.getScrollPosition();

    for (const gathererDefn of gatherers) {
      const gatherer = gathererDefn.instance;
      const status = {
        msg: `Gathering: ${gatherer.name}`,
        id: `lh:gather:afterPass:${gatherer.name}`,
      };
      log.time(status);

      const artifactPromise = Promise.resolve()
        .then(_ => gatherer.afterPass(passContext, loadData));

      const gathererResult = gathererResults[gatherer.name] || [];
      gathererResult.push(artifactPromise);
      gathererResults[gatherer.name] = gathererResult;
      await artifactPromise.catch(() => {});
      await driver.scrollTo(scrollPosition);
      log.timeEnd(status);
    }
    log.timeEnd(apStatus);
  }

  /**
   * Takes the results of each gatherer phase for each gatherer and uses the
   * last produced value (that's not undefined) as the artifact for that
   * gatherer. If an error was rejected from a gatherer phase,
   * uses that error object as the artifact instead.
   * @param {Partial<GathererResults>} gathererResults
   * @return {Promise<{artifacts: Partial<LH.GathererArtifacts>}>}
   */
  static async collectArtifacts(gathererResults) {
    /** @type {Partial<LH.GathererArtifacts>} */
    const gathererArtifacts = {};

    const resultsEntries = /** @type {GathererResultsEntries} */ (Object.entries(gathererResults));
    for (const [gathererName, phaseResultsPromises] of resultsEntries) {
      try {
        const phaseResults = await Promise.all(phaseResultsPromises);
        // Take the last defined pass result as artifact. If none are defined, the undefined check below handles it.
        const definedResults = phaseResults.filter(element => element !== undefined);
        const artifact = definedResults[definedResults.length - 1];
        // @ts-expect-error tsc can't yet express that gathererName is only a single type in each iteration, not a union of types.
        gathererArtifacts[gathererName] = artifact;
      } catch (err) {
        // Return error to runner to handle turning it into an error audit.
        gathererArtifacts[gathererName] = err;
      }

      if (gathererArtifacts[gathererName] === undefined) {
        throw new Error(`${gathererName} failed to provide an artifact.`);
      }
    }

    return {
      artifacts: gathererArtifacts,
    };
  }

  /**
   * Return an initialized but mostly empty set of base artifacts, to be
   * populated as the run continues.
   * @param {{driver: Driver, requestedUrl: string, settings: LH.Config.Settings}} options
   * @return {Promise<LH.BaseArtifacts>}
   */
  static async initializeBaseArtifacts(options) {
    const hostUserAgent = (await options.driver.getBrowserVersion()).userAgent;

    // Whether Lighthouse was run on a mobile device (i.e. not on a desktop machine).
    const HostFormFactor = hostUserAgent.includes('Android') || hostUserAgent.includes('Mobile') ?
      'mobile' : 'desktop';

    return {
      fetchTime: (new Date()).toJSON(),
      LighthouseRunWarnings: [],
      HostFormFactor,
      HostUserAgent: hostUserAgent,
      NetworkUserAgent: '', // updated later
      BenchmarkIndex: 0, // updated later
      WebAppManifest: null, // updated later
      InstallabilityErrors: {errors: []}, // updated later
      Stacks: [], // updated later
      traces: {},
      devtoolsLogs: {},
      settings: options.settings,
      URL: {requestedUrl: options.requestedUrl, finalUrl: options.requestedUrl},
      Timing: [],
      PageLoadError: null,
    };
  }

  /**
   * Populates the important base artifacts from a fully loaded test page.
   * Currently must be run before `start-url` gatherer so that `WebAppManifest`
   * will be available to it.
   * @param {LH.Gatherer.PassContext} passContext
   */
  static async populateBaseArtifacts(passContext) {
    const status = {msg: 'Populate base artifacts', id: 'lh:gather:populateBaseArtifacts'};
    log.time(status);
    const baseArtifacts = passContext.baseArtifacts;

    // Copy redirected URL to artifact.
    baseArtifacts.URL.finalUrl = passContext.url;

    // Fetch the manifest, if it exists.
    baseArtifacts.WebAppManifest = await WebAppManifest.getWebAppManifest(
      passContext.driver.defaultSession, passContext.url);

    if (baseArtifacts.WebAppManifest) {
      baseArtifacts.InstallabilityErrors = await InstallabilityErrors.getInstallabilityErrors(
        passContext.driver.defaultSession);
    }

    baseArtifacts.Stacks = await Stacks.collectStacks(passContext.driver.executionContext);

    // Find the NetworkUserAgent actually used in the devtoolsLogs.
    const devtoolsLog = baseArtifacts.devtoolsLogs[passContext.passConfig.passName];
    baseArtifacts.NetworkUserAgent = NetworkUserAgent.getNetworkUserAgent(devtoolsLog);

    const environmentWarnings = getEnvironmentWarnings(passContext);
    baseArtifacts.LighthouseRunWarnings.push(...environmentWarnings);

    log.timeEnd(status);
  }

  /**
   * Finalize baseArtifacts after gathering is fully complete.
   * @param {LH.BaseArtifacts} baseArtifacts
   */
  static finalizeBaseArtifacts(baseArtifacts) {
    // Take only unique LighthouseRunWarnings.

    /** @type {(string | LH.IcuMessage)[]} */
    const lighthouseRunWarnings = [];
    for (const warning of baseArtifacts.LighthouseRunWarnings) {
      // each entry in baseArtifacts.LighthouseRunWarnings can be a string or a LH.IcuMessage.
      if (!lighthouseRunWarnings.some(existing => isDeepEqual(warning, existing))) {
        lighthouseRunWarnings.push(warning);
      }
    }

    baseArtifacts.LighthouseRunWarnings = lighthouseRunWarnings;

    // Take the timing entries we've gathered so far.
    baseArtifacts.Timing = log.getTimeEntries();
  }

  /**
   * @param {Array<LH.Config.Pass>} passConfigs
   * @param {{driver: Driver, requestedUrl: string, settings: LH.Config.Settings, computedCache: Map<string, ArbitraryEqualityMap>}} options
   * @return {Promise<LH.Artifacts>}
   */
  static async run(passConfigs, options) {
    const driver = options.driver;

    /** @type {Partial<LH.GathererArtifacts>} */
    const artifacts = {};

    try {
      await driver.connect();
      // In the devtools/extension case, we can't still be on the site while trying to clear state
      // So we first navigate to about:blank, then apply our emulation & setup
      await GatherRunner.loadBlank(driver);

      const baseArtifacts = await GatherRunner.initializeBaseArtifacts(options);
      baseArtifacts.BenchmarkIndex = await getBenchmarkIndex(driver.executionContext);

      await GatherRunner.setupDriver(driver, options);

      let isFirstPass = true;
      for (const passConfig of passConfigs) {
        /** @type {LH.Gatherer.PassContext} */
        const passContext = {
          gatherMode: 'navigation',
          driver,
          url: options.requestedUrl,
          settings: options.settings,
          passConfig,
          baseArtifacts,
          computedCache: options.computedCache,
          LighthouseRunWarnings: baseArtifacts.LighthouseRunWarnings,
        };
        const passResults = await GatherRunner.runPass(passContext);
        Object.assign(artifacts, passResults.artifacts);

        // If we encountered a pageLoadError, don't try to keep loading the page in future passes.
        if (passResults.pageLoadError && passConfig.loadFailureMode === 'fatal') {
          baseArtifacts.PageLoadError = passResults.pageLoadError;
          break;
        }

        if (isFirstPass) {
          await GatherRunner.populateBaseArtifacts(passContext);
          isFirstPass = false;
        }

        // Disable fetcher for every pass, in case a gatherer enabled it.
        // Noop if fetcher was never enabled.
        // This cleanup should be removed once the only usage of
        // fetcher (fetching arbitrary URLs) is replaced by new protocol support.
        await driver.fetcher.disable();
      }

      await GatherRunner.disposeDriver(driver, options);
      GatherRunner.finalizeBaseArtifacts(baseArtifacts);
      return /** @type {LH.Artifacts} */ ({...baseArtifacts, ...artifacts}); // Cast to drop Partial<>.
    } catch (err) {
      // Clean up on error. Don't await so that the root error, not a disposal error, is shown.
      GatherRunner.disposeDriver(driver, options);

      throw err;
    }
  }

  /**
   * Save the devtoolsLog and trace (if applicable) to baseArtifacts.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @param {string} passName
   */
  static _addLoadDataToBaseArtifacts(passContext, loadData, passName) {
    const baseArtifacts = passContext.baseArtifacts;
    baseArtifacts.devtoolsLogs[passName] = loadData.devtoolsLog;
    if (loadData.trace) baseArtifacts.traces[passName] = loadData.trace;
  }

  /**
   * Starting from about:blank, load the page and run gatherers for this pass.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<{artifacts: Partial<LH.GathererArtifacts>, pageLoadError?: LH.LighthouseError}>}
   */
  static async runPass(passContext) {
    const status = {
      msg: `Running ${passContext.passConfig.passName} pass`,
      id: `lh:gather:runPass-${passContext.passConfig.passName}`,
      args: [passContext.passConfig.gatherers.map(g => g.instance.name).join(', ')],
    };
    log.time(status);

    /** @type {Partial<GathererResults>} */
    const gathererResults = {};
    const {driver, passConfig} = passContext;

    // Go to about:blank, set up, and run `beforePass()` on gatherers.
    await GatherRunner.loadBlank(driver, passConfig.blankPage);
    const {warnings} = await prepare.prepareTargetForIndividualNavigation(
      driver.defaultSession,
      passContext.settings,
      {
        url: passContext.url,
        disableStorageReset: !passConfig.useThrottling,
        disableThrottling: !passConfig.useThrottling,
        blockedUrlPatterns: passConfig.blockedUrlPatterns,
      }
    );
    passContext.LighthouseRunWarnings.push(...warnings);
    await GatherRunner.beforePass(passContext, gathererResults);

    // Navigate, start recording, and run `pass()` on gatherers.
    await GatherRunner.beginRecording(passContext);
    const {navigationError: possibleNavError} = await GatherRunner.loadPage(driver, passContext);
    await GatherRunner.pass(passContext, gathererResults);
    const loadData = await GatherRunner.endRecording(passContext);

    // Disable throttling so the afterPass analysis isn't throttled.
    await emulation.clearThrottling(driver.defaultSession);

    // In case of load error, save log and trace with an error prefix, return no artifacts for this pass.
    const pageLoadError = getPageLoadError(possibleNavError, {
      url: passContext.url,
      loadFailureMode: passConfig.loadFailureMode,
      networkRecords: loadData.networkRecords,
    });
    if (pageLoadError) {
      const localizedMessage = i18n.getFormatted(pageLoadError.friendlyMessage,
          passContext.settings.locale);
      log.error('GatherRunner', localizedMessage, passContext.url);

      passContext.LighthouseRunWarnings.push(pageLoadError.friendlyMessage);
      GatherRunner._addLoadDataToBaseArtifacts(passContext, loadData,
          `pageLoadError-${passConfig.passName}`);

      log.timeEnd(status);
      return {artifacts: {}, pageLoadError};
    }

    // If no error, save devtoolsLog and trace.
    GatherRunner._addLoadDataToBaseArtifacts(passContext, loadData, passConfig.passName);

    // Run `afterPass()` on gatherers and return collected artifacts.
    await GatherRunner.afterPass(passContext, loadData, gathererResults);
    const artifacts = GatherRunner.collectArtifacts(gathererResults);

    log.timeEnd(status);
    return artifacts;
  }
}

module.exports = GatherRunner;
