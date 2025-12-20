/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');
const manifestParser = require('../lib/manifest-parser.js');
const stacksGatherer = require('../lib/stack-collector.js');
const LHError = require('../lib/lh-error.js');
const NetworkAnalyzer = require('../lib/dependency-graph/simulator/network-analyzer.js');
const NetworkRecorder = require('../lib/network-recorder.js');
const constants = require('../config/constants.js');
const i18n = require('../lib/i18n/i18n.js');
const URL = require('../lib/url-shim.js');

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

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/** @typedef {import('../gather/driver.js')} Driver */

/** @typedef {import('./gatherers/gatherer.js').PhaseResult} PhaseResult */
/**
 * Each entry in each gatherer result array is the output of a gatherer phase:
 * `beforePass`, `pass`, and `afterPass`. Flattened into an `LH.Artifacts` in
 * `collectArtifacts`.
 * @typedef {Record<keyof LH.GathererArtifacts, Array<PhaseResult|Promise<PhaseResult>>>} GathererResults
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
    await driver.gotoURL(url, {waitForNavigated: true});
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
      const {finalUrl, timedOut} = await driver.gotoURL(passContext.url, {
        waitForFcp: passContext.passConfig.recordTrace,
        waitForLoad: true,
        passContext,
      });
      passContext.url = finalUrl;
      if (timedOut) passContext.LighthouseRunWarnings.push(str_(UIStrings.warningTimeout));
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
   * @param {Driver} driver
   * @param {{requestedUrl: string, settings: LH.Config.Settings}} options
   * @return {Promise<void>}
   */
  static async setupDriver(driver, options) {
    const status = {msg: 'Initializing…', id: 'lh:gather:setupDriver'};
    log.time(status);
    const resetStorage = !options.settings.disableStorageReset;
    await driver.assertNoSameOriginServiceWorkerClients(options.requestedUrl);
    await driver.beginEmulation(options.settings);
    await driver.enableRuntimeEvents();
    await driver.enableAsyncStacks();
    await driver.cacheNatives();
    await driver.registerPerformanceObserver();
    await driver.dismissJavaScriptDialogs();
    if (resetStorage) await driver.clearDataForOrigin(options.requestedUrl);
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
      const resetStorage = !options.settings.disableStorageReset;
      if (resetStorage) await driver.clearDataForOrigin(options.requestedUrl);

      // Disable fetcher, in case a gatherer enabled it.
      // This cleanup should be removed once the only usage of
      // fetcher (fetching arbitrary URLs) is replaced by new protocol support.
      await driver.fetcher.disableRequestInterception();

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
   * Returns an error if the original network request failed or wasn't found.
   * @param {LH.Artifacts.NetworkRequest|undefined} mainRecord
   * @return {LH.LighthouseError|undefined}
   */
  static getNetworkError(mainRecord) {
    if (!mainRecord) {
      return new LHError(LHError.errors.NO_DOCUMENT_REQUEST);
    } else if (mainRecord.failed) {
      const netErr = mainRecord.localizedFailDescription;
      // Match all resolution and DNS failures
      // https://cs.chromium.org/chromium/src/net/base/net_error_list.h?rcl=cd62979b
      if (
        netErr === 'net::ERR_NAME_NOT_RESOLVED' ||
        netErr === 'net::ERR_NAME_RESOLUTION_FAILED' ||
        netErr.startsWith('net::ERR_DNS_')
      ) {
        return new LHError(LHError.errors.DNS_FAILURE);
      } else {
        return new LHError(
          LHError.errors.FAILED_DOCUMENT_REQUEST,
          {errorDetails: netErr}
        );
      }
    } else if (mainRecord.hasErrorStatusCode()) {
      return new LHError(
        LHError.errors.ERRORED_DOCUMENT_REQUEST,
        {statusCode: `${mainRecord.statusCode}`}
      );
    }
  }

  /**
   * Returns an error if we ended up on the `chrome-error` page and all other requests failed.
   * @param {LH.Artifacts.NetworkRequest|undefined} mainRecord
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {LH.LighthouseError|undefined}
   */
  static getInterstitialError(mainRecord, networkRecords) {
    // If we never requested a document, there's no interstitial error, let other cases handle it.
    if (!mainRecord) return undefined;

    const interstitialRequest = networkRecords
      .find(record => record.documentURL.startsWith('chrome-error://'));
    // If the page didn't end up on a chrome interstitial, there's no error here.
    if (!interstitialRequest) return undefined;

    // If the main document didn't fail, we didn't end up on an interstitial.
    // FIXME: This doesn't handle client-side redirects.
    // None of our error-handling deals with this case either because passContext.url doesn't handle non-network redirects.
    if (!mainRecord.failed) return undefined;

    // If a request failed with the `net::ERR_CERT_*` collection of errors, then it's a security issue.
    if (mainRecord.localizedFailDescription.startsWith('net::ERR_CERT')) {
      return new LHError(LHError.errors.INSECURE_DOCUMENT_REQUEST, {securityMessages:
        mainRecord.localizedFailDescription});
    }

    // If we made it this far, it's a generic Chrome interstitial error.
    return new LHError(LHError.errors.CHROME_INTERSTITIAL_ERROR);
  }

  /**
   * Returns an error if the page load should be considered failed, e.g. from a
   * main document request failure, a security issue, etc.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @param {LH.LighthouseError|undefined} navigationError
   * @return {LH.LighthouseError|undefined}
   */
  static getPageLoadError(passContext, loadData, navigationError) {
    const {networkRecords} = loadData;
    /** @type {LH.Artifacts.NetworkRequest|undefined} */
    let mainRecord;
    try {
      mainRecord = NetworkAnalyzer.findMainDocument(networkRecords, passContext.url);
    } catch (_) {}

    const networkError = GatherRunner.getNetworkError(mainRecord);
    const interstitialError = GatherRunner.getInterstitialError(mainRecord, networkRecords);

    // Check to see if we need to ignore the page load failure.
    // e.g. When the driver is offline, the load will fail without page offline support.
    if (passContext.passConfig.loadFailureMode === 'ignore') return;

    // We want to special-case the interstitial beyond FAILED_DOCUMENT_REQUEST. See https://github.com/GoogleChrome/lighthouse/pull/8865#issuecomment-497507618
    if (interstitialError) return interstitialError;

    // Network errors are usually the most specific and provide the best reason for why the page failed to load.
    // Prefer networkError over navigationError.
    // Example: `DNS_FAILURE` is better than `NO_FCP`.
    if (networkError) return networkError;

    // Navigation errors are rather generic and express some failure of the page to render properly.
    // Use `navigationError` as the last resort.
    // Example: `NO_FCP`, the page never painted content for some unknown reason.
    return navigationError;
  }

  /**
   * Initialize network settings for the pass, e.g. throttling, blocked URLs,
   * and manual request headers.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<void>}
   */
  static async setupPassNetwork(passContext) {
    const status = {msg: 'Setting up network for the pass trace', id: `lh:gather:setupPassNetwork`};
    log.time(status);

    const passConfig = passContext.passConfig;
    await passContext.driver.setThrottling(passContext.settings, passConfig);

    const blockedUrls = (passContext.passConfig.blockedUrlPatterns || [])
      .concat(passContext.settings.blockedUrlPatterns || []);

    // Set request blocking before any network activity
    // No "clearing" is done at the end of the pass since blockUrlPatterns([]) will unset all if
    // neccessary at the beginning of the next pass.
    await passContext.driver.blockUrlPatterns(blockedUrls);
    await passContext.driver.setExtraHTTPHeaders(passContext.settings.extraHeaders);

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
    const networkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
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
      // Abuse the passContext to pass through gatherer options
      passContext.options = gathererDefn.options || {};
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
      // Abuse the passContext to pass through gatherer options
      passContext.options = gathererDefn.options || {};
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

      // Add gatherer options to the passContext.
      passContext.options = gathererDefn.options || {};
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
        // @ts-ignore tsc can't yet express that gathererName is only a single type in each iteration, not a union of types.
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

    const {emulatedFormFactor} = options.settings;
    // Whether Lighthouse was run on a mobile device (i.e. not on a desktop machine).
    const HostFormFactor = hostUserAgent.includes('Android') || hostUserAgent.includes('Mobile') ?
      'mobile' : 'desktop';
    const TestedAsMobileDevice = emulatedFormFactor === 'mobile' ||
      (emulatedFormFactor !== 'desktop' && HostFormFactor === 'mobile');

    return {
      fetchTime: (new Date()).toJSON(),
      LighthouseRunWarnings: [],
      TestedAsMobileDevice,
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
   * Creates an Artifacts.InstallabilityErrors, tranforming data from the protocol
   * for old versions of Chrome.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.InstallabilityErrors>}
   */
  static async getInstallabilityErrors(passContext) {
    const response =
      await passContext.driver.sendCommand('Page.getInstallabilityErrors');

    let errors = response.installabilityErrors;
    // Before M82, `getInstallabilityErrors` was not localized and just english
    // error strings were returned. Convert the values we care about to the new error id format.
    if (!errors) {
      /** @type {string[]} */
      // @ts-ignore - Support older protocol data.
      const m81StyleErrors = response.errors || [];
      errors = m81StyleErrors.map(error => {
        const englishErrorToErrorId = {
          'Could not download a required icon from the manifest': 'cannot-download-icon',
          'Downloaded icon was empty or corrupted': 'no-icon-available',
        };
        for (const [englishError, errorId] of Object.entries(englishErrorToErrorId)) {
          if (error.includes(englishError)) {
            return {errorId, errorArguments: []};
          }
        }
        return {errorId: '', errorArguments: []};
      }).filter(error => error.errorId);
    }

    return {errors};
  }

  /**
   * Populates the important base artifacts from a fully loaded test page.
   * Currently must be run before `start-url` gatherer so that `WebAppManifest`
   * will be available to it.
   * @param {LH.Gatherer.PassContext} passContext
   */
  static async populateBaseArtifacts(passContext) {
    const baseArtifacts = passContext.baseArtifacts;

    // Copy redirected URL to artifact.
    baseArtifacts.URL.finalUrl = passContext.url;
    /* eslint-disable max-len */
    if (!URL.equalWithExcludedFragments(baseArtifacts.URL.requestedUrl, baseArtifacts.URL.finalUrl)) {
      baseArtifacts.LighthouseRunWarnings.push(str_(UIStrings.warningRedirected, {
        requested: baseArtifacts.URL.requestedUrl,
        final: baseArtifacts.URL.finalUrl,
      }));
    }

    // Fetch the manifest, if it exists.
    baseArtifacts.WebAppManifest = await GatherRunner.getWebAppManifest(passContext);

    if (baseArtifacts.WebAppManifest) {
      baseArtifacts.InstallabilityErrors = await GatherRunner.getInstallabilityErrors(passContext);
    }

    baseArtifacts.Stacks = await stacksGatherer(passContext);

    // Find the NetworkUserAgent actually used in the devtoolsLogs.
    const devtoolsLog = baseArtifacts.devtoolsLogs[passContext.passConfig.passName];
    const userAgentEntry = devtoolsLog.find(entry =>
      entry.method === 'Network.requestWillBeSent' &&
      !!entry.params.request.headers['User-Agent']
    );
    if (userAgentEntry) {
      // @ts-ignore - guaranteed to exist by the find above
      baseArtifacts.NetworkUserAgent = userAgentEntry.params.request.headers['User-Agent'];
    }
  }

  /**
   * Finalize baseArtifacts after gathering is fully complete.
   * @param {LH.BaseArtifacts} baseArtifacts
   */
  static finalizeBaseArtifacts(baseArtifacts) {
    // Take only unique LighthouseRunWarnings.
    baseArtifacts.LighthouseRunWarnings = Array.from(new Set(baseArtifacts.LighthouseRunWarnings));

    // Take the timing entries we've gathered so far.
    baseArtifacts.Timing = log.getTimeEntries();
  }

  /**
   * Uses the debugger protocol to fetch the manifest from within the context of
   * the target page, reusing any credentials, emulation, etc, already established
   * there.
   *
   * Returns the parsed manifest or null if the page had no manifest. If the manifest
   * was unparseable as JSON, manifest.value will be undefined and manifest.warning
   * will have the reason. See manifest-parser.js for more information.
   *
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.Manifest|null>}
   */
  static async getWebAppManifest(passContext) {
    const response = await passContext.driver.getAppManifest();
    if (!response) return null;
    return manifestParser(response.data, response.url, passContext.url);
  }

  /**
   * @param {Array<LH.Config.Pass>} passConfigs
   * @param {{driver: Driver, requestedUrl: string, settings: LH.Config.Settings}} options
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
      baseArtifacts.BenchmarkIndex = await options.driver.getBenchmarkIndex();

      await GatherRunner.setupDriver(driver, options);

      let isFirstPass = true;
      for (const passConfig of passConfigs) {
        /** @type {LH.Gatherer.PassContext} */
        const passContext = {
          driver,
          url: options.requestedUrl,
          settings: options.settings,
          passConfig,
          baseArtifacts,
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
        await driver.fetcher.disableRequestInterception();
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
   * Returns whether this pass should clear the caches.
   * Only if it is a performance run and the settings don't disable it.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {boolean}
   */
  static shouldClearCaches(passContext) {
    const {settings, passConfig} = passContext;
    return !settings.disableStorageReset && passConfig.recordTrace && passConfig.useThrottling;
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
   * @return {Promise<{artifacts: Partial<LH.GathererArtifacts>, pageLoadError?: LHError}>}
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
    await GatherRunner.setupPassNetwork(passContext);
    if (GatherRunner.shouldClearCaches(passContext)) {
      await driver.cleanBrowserCaches(); // Clear disk & memory cache if it's a perf run
    }
    await GatherRunner.beforePass(passContext, gathererResults);

    // Navigate, start recording, and run `pass()` on gatherers.
    await GatherRunner.beginRecording(passContext);
    const {navigationError: possibleNavError} = await GatherRunner.loadPage(driver, passContext);
    await GatherRunner.pass(passContext, gathererResults);
    const loadData = await GatherRunner.endRecording(passContext);

    // Disable throttling so the afterPass analysis isn't throttled
    await driver.setThrottling(passContext.settings, {useThrottling: false});

    // In case of load error, save log and trace with an error prefix, return no artifacts for this pass.
    const pageLoadError = GatherRunner.getPageLoadError(passContext, loadData, possibleNavError);
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
module.exports.UIStrings = UIStrings;
