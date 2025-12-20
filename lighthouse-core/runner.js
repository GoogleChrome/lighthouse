/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const isDeepEqual = require('lodash.isequal');
const Driver = require('./gather/driver.js');
const GatherRunner = require('./gather/gather-runner.js');
const ReportScoring = require('./scoring.js');
const Audit = require('./audits/audit.js');
const log = require('lighthouse-logger');
const i18n = require('./lib/i18n/i18n.js');
const stackPacks = require('./lib/stack-packs.js');
const assetSaver = require('./lib/asset-saver.js');
const fs = require('fs');
const path = require('path');
const URL = require('./lib/url-shim.js');
const Sentry = require('./lib/sentry.js');
const generateReport = require('./report/report-generator.js').generateReport;
const LHError = require('./lib/lh-error.js');

/** @typedef {import('./gather/connections/connection.js')} Connection */
/** @typedef {import('./config/config.js')} Config */

class Runner {
  /**
   * @param {Connection} connection
   * @param {{config: Config, url?: string, driverMock?: Driver}} runOpts
   * @return {Promise<LH.RunnerResult|undefined>}
   */
  static async run(connection, runOpts) {
    const settings = runOpts.config.settings;
    try {
      const runnerStatus = {msg: 'Runner setup', id: 'lh:runner:run'};
      log.time(runnerStatus, 'verbose');

      /**
       * List of top-level warnings for this Lighthouse run.
       * @type {Array<string>}
       */
      const lighthouseRunWarnings = [];

      const sentryContext = Sentry.getContext();
      Sentry.captureBreadcrumb({
        message: 'Run started',
        category: 'lifecycle',
        data: sentryContext && sentryContext.extra,
      });

      // User can run -G solo, -A solo, or -GA together
      // -G and -A will run partial lighthouse pipelines,
      // and -GA will run everything plus save artifacts to disk

      // Gather phase
      // Either load saved artifacts off disk or from the browser
      let artifacts;
      let requestedUrl;
      if (settings.auditMode && !settings.gatherMode) {
        // No browser required, just load the artifacts from disk.
        const path = Runner._getArtifactsPath(settings);
        artifacts = assetSaver.loadArtifacts(path);
        requestedUrl = artifacts.URL.requestedUrl;

        if (!requestedUrl) {
          throw new Error('Cannot run audit mode on empty URL');
        }
        if (runOpts.url && !URL.equalWithExcludedFragments(runOpts.url, requestedUrl)) {
          throw new Error('Cannot run audit mode on different URL');
        }
      } else {
        // verify the url is valid and that protocol is allowed
        if (runOpts.url && URL.isValid(runOpts.url) && URL.isProtocolAllowed(runOpts.url)) {
          // Use canonicalized URL (with trailing slashes and such)
          requestedUrl = new URL(runOpts.url).href;
        } else {
          throw new LHError(LHError.errors.INVALID_URL);
        }

        artifacts = await Runner._gatherArtifactsFromBrowser(requestedUrl, runOpts, connection);
        // -G means save these to ./latest-run, etc.
        if (settings.gatherMode) {
          const path = Runner._getArtifactsPath(settings);
          await assetSaver.saveArtifacts(artifacts, path);
        }
      }

      // Potentially quit early
      if (settings.gatherMode && !settings.auditMode) return;

      // Audit phase
      if (!runOpts.config.audits) {
        throw new Error('No audits to evaluate.');
      }
      const auditResults = await Runner._runAudits(settings, runOpts.config.audits, artifacts,
          lighthouseRunWarnings);

      // LHR construction phase
      const resultsStatus = {msg: 'Generating results...', id: 'lh:runner:generate'};
      log.time(resultsStatus);

      if (artifacts.LighthouseRunWarnings) {
        lighthouseRunWarnings.push(...artifacts.LighthouseRunWarnings);
      }

      // Entering: conclusion of the lighthouse result object
      const lighthouseVersion = require('../package.json').version;

      /** @type {Object<string, LH.Audit.Result>} */
      const resultsById = {};
      for (const audit of auditResults) {
        resultsById[audit.id] = audit;
      }

      /** @type {Object<string, LH.Result.Category>} */
      let categories = {};
      if (runOpts.config.categories) {
        categories = ReportScoring.scoreAllCategories(runOpts.config.categories, resultsById);
      }

      log.timeEnd(resultsStatus);
      log.timeEnd(runnerStatus);

      /** @type {LH.Result} */
      const lhr = {
        userAgent: artifacts.HostUserAgent,
        environment: {
          networkUserAgent: artifacts.NetworkUserAgent,
          hostUserAgent: artifacts.HostUserAgent,
          benchmarkIndex: artifacts.BenchmarkIndex,
        },
        lighthouseVersion,
        fetchTime: artifacts.fetchTime,
        requestedUrl: requestedUrl,
        finalUrl: artifacts.URL.finalUrl,
        runWarnings: lighthouseRunWarnings,
        runtimeError: Runner.getArtifactRuntimeError(artifacts),
        audits: resultsById,
        configSettings: settings,
        categories,
        categoryGroups: runOpts.config.groups || undefined,
        timing: this._getTiming(artifacts),
        i18n: {
          rendererFormattedStrings: i18n.getRendererFormattedStrings(settings.locale),
          icuMessagePaths: {},
        },
        stackPacks: stackPacks.getStackPacks(artifacts.Stacks),
      };

      // Replace ICU message references with localized strings; save replaced paths in lhr.
      lhr.i18n.icuMessagePaths = i18n.replaceIcuMessageInstanceIds(lhr, settings.locale);

      // Create the HTML, JSON, and/or CSV string
      const report = generateReport(lhr, settings.output);

      return {lhr, artifacts, report};
    } catch (err) {
      // i18n error strings
      err.friendlyMessage = i18n.getFormatted(err.friendlyMessage, settings.locale);
      await Sentry.captureException(err, {level: 'fatal'});
      throw err;
    }
  }

  /**
   * This handles both the auditMode case where gatherer entries need to be merged in and
   * the gather/audit case where timingEntriesFromRunner contains all entries from this run,
   * including those also in timingEntriesFromArtifacts.
   * @param {LH.Artifacts} artifacts
   * @return {LH.Result.Timing}
   */
  static _getTiming(artifacts) {
    const timingEntriesFromArtifacts = artifacts.Timing || [];
    const timingEntriesFromRunner = log.takeTimeEntries();
    const timingEntriesKeyValues = [
      ...timingEntriesFromArtifacts,
      ...timingEntriesFromRunner,
      // As entries can share a name, dedupe based on the startTime timestamp
    ].map(entry => /** @type {[number, PerformanceEntry]} */ ([entry.startTime, entry]));
    const timingEntries = Array.from(new Map(timingEntriesKeyValues).values())
    // Truncate timestamps to hundredths of a millisecond saves ~4KB. No need for microsecond
    // resolution.
    .map(entry => {
      return /** @type {PerformanceEntry} */ ({
        // Don't spread entry because browser PerformanceEntries can't be spread.
        // https://github.com/GoogleChrome/lighthouse/issues/8638
        startTime: parseFloat(entry.startTime.toFixed(2)),
        name: entry.name,
        duration: parseFloat(entry.duration.toFixed(2)),
        entryType: entry.entryType,
      });
    });
    const runnerEntry = timingEntries.find(e => e.name === 'lh:runner:run');
    return {entries: timingEntries, total: runnerEntry && runnerEntry.duration || 0};
  }

  /**
   * Establish connection, load page and collect all required artifacts
   * @param {string} requestedUrl
   * @param {{config: Config, driverMock?: Driver}} runnerOpts
   * @param {Connection} connection
   * @return {Promise<LH.Artifacts>}
   */
  static async _gatherArtifactsFromBrowser(requestedUrl, runnerOpts, connection) {
    if (!runnerOpts.config.passes) {
      throw new Error('No browser artifacts are either provided or requested.');
    }
    const driver = runnerOpts.driverMock || new Driver(connection);
    const gatherOpts = {
      driver,
      requestedUrl,
      settings: runnerOpts.config.settings,
    };
    const artifacts = await GatherRunner.run(runnerOpts.config.passes, gatherOpts);
    return artifacts;
  }

  /**
   * Run all audits with specified settings and artifacts.
   * @param {LH.Config.Settings} settings
   * @param {Array<LH.Config.AuditDefn>} audits
   * @param {LH.Artifacts} artifacts
   * @param {Array<string>} runWarnings
   * @return {Promise<Array<LH.Audit.Result>>}
   */
  static async _runAudits(settings, audits, artifacts, runWarnings) {
    const status = {msg: 'Analyzing and running audits...', id: 'lh:runner:auditing'};
    log.time(status);

    if (artifacts.settings) {
      const overrides = {
        locale: undefined,
        gatherMode: undefined,
        auditMode: undefined,
        output: undefined,
        channel: undefined,
        budgets: undefined,
      };
      const normalizedGatherSettings = Object.assign({}, artifacts.settings, overrides);
      const normalizedAuditSettings = Object.assign({}, settings, overrides);

      if (!isDeepEqual(normalizedGatherSettings, normalizedAuditSettings)) {
        throw new Error('Cannot change settings between gathering and auditing');
      }
    }

    // Members of LH.Audit.Context that are shared across all audits.
    const sharedAuditContext = {
      settings,
      computedCache: new Map(),
    };

    // Run each audit sequentially
    const auditResults = [];
    for (const auditDefn of audits) {
      const auditResult = await Runner._runAudit(auditDefn, artifacts, sharedAuditContext,
          runWarnings);
      auditResults.push(auditResult);
    }

    log.timeEnd(status);
    return auditResults;
  }

  /**
   * Checks that the audit's required artifacts exist and runs the audit if so.
   * Otherwise returns error audit result.
   * @param {LH.Config.AuditDefn} auditDefn
   * @param {LH.Artifacts} artifacts
   * @param {Pick<LH.Audit.Context, 'settings'|'computedCache'>} sharedAuditContext
   * @param {Array<string>} runWarnings
   * @return {Promise<LH.Audit.Result>}
   * @private
   */
  static async _runAudit(auditDefn, artifacts, sharedAuditContext, runWarnings) {
    const audit = auditDefn.implementation;
    const status = {
      msg: `Auditing: ${i18n.getFormatted(audit.meta.title, 'en-US')}`,
      id: `lh:audit:${audit.meta.id}`,
    };
    log.time(status);

    let auditResult;
    try {
      // Return an early error if an artifact required for the audit is missing or an error.
      for (const artifactName of audit.meta.requiredArtifacts) {
        const noArtifact = artifacts[artifactName] === undefined;

        // If trace/devtoolsLog required, check that DEFAULT_PASS trace/devtoolsLog exists.
        // NOTE: for now, not a pass-specific check of traces or devtoolsLogs.
        const noRequiredTrace = artifactName === 'traces' && !artifacts.traces[Audit.DEFAULT_PASS];
        const noRequiredDevtoolsLog = artifactName === 'devtoolsLogs' &&
            !artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

        if (noArtifact || noRequiredTrace || noRequiredDevtoolsLog) {
          log.warn('Runner',
              `${artifactName} gatherer, required by audit ${audit.meta.id}, did not run.`);
          throw new LHError(LHError.errors.MISSING_REQUIRED_ARTIFACT, {artifactName});
        }

        // If artifact was an error, output error result on behalf of audit.
        if (artifacts[artifactName] instanceof Error) {
          /** @type {Error} */
          // @ts-ignore An artifact *could* be an Error, but caught here, so ignore elsewhere.
          const artifactError = artifacts[artifactName];

          Sentry.captureException(artifactError, {
            tags: {gatherer: artifactName},
            level: 'error',
          });

          log.warn('Runner', `${artifactName} gatherer, required by audit ${audit.meta.id},` +
            ` encountered an error: ${artifactError.message}`);

          // Create a friendlier display error and mark it as expected to avoid duplicates in Sentry
          const error = new LHError(LHError.errors.ERRORED_REQUIRED_ARTIFACT,
              {artifactName, errorMessage: artifactError.message});
          // @ts-ignore Non-standard property added to Error
          error.expected = true;
          throw error;
        }
      }

      // all required artifacts are in good shape, so we proceed
      const auditOptions = Object.assign({}, audit.defaultOptions, auditDefn.options);
      const auditContext = {
        options: auditOptions,
        ...sharedAuditContext,
      };

      // Only pass the declared required and optional artifacts to the audit
      // The type is masquerading as `LH.Artifacts` but will only contain a subset of the keys
      // to prevent consumers from unnecessary type assertions.
      const requestedArtifacts = audit.meta.requiredArtifacts
        .concat(audit.meta.__internalOptionalArtifacts || []);
      const narrowedArtifacts = requestedArtifacts
        .reduce((narrowedArtifacts, artifactName) => {
          const requestedArtifact = artifacts[artifactName];
          // @ts-ignore tsc can't yet express that artifactName is only a single type in each iteration, not a union of types.
          narrowedArtifacts[artifactName] = requestedArtifact;
          return narrowedArtifacts;
        }, /** @type {LH.Artifacts} */ ({}));
      const product = await audit.audit(narrowedArtifacts, auditContext);
      runWarnings.push(...product.runWarnings || []);

      auditResult = Audit.generateAuditResult(audit, product);
    } catch (err) {
      // Log error if it hasn't already been logged above.
      if (err.code !== 'MISSING_REQUIRED_ARTIFACT' && err.code !== 'ERRORED_REQUIRED_ARTIFACT') {
        log.warn(audit.meta.id, `Caught exception: ${err.message}`);
      }

      Sentry.captureException(err, {tags: {audit: audit.meta.id}, level: 'error'});
      // Errors become error audit result.
      const errorMessage = err.friendlyMessage ? err.friendlyMessage : err.message;
      auditResult = Audit.generateErrorAuditResult(audit, errorMessage);
    }

    log.timeEnd(status);
    return auditResult;
  }

  /**
   * Searches a pass's artifacts for any `lhrRuntimeError` error artifacts.
   * Returns the first one found or `null` if none found.
   * @param {LH.Artifacts} artifacts
   * @return {LH.Result['runtimeError']|undefined}
   */
  static getArtifactRuntimeError(artifacts) {
    const possibleErrorArtifacts = [
      artifacts.PageLoadError, // Preferentially use `PageLoadError`, if it exists.
      ...Object.values(artifacts), // Otherwise check amongst all artifacts.
    ];

    for (const possibleErrorArtifact of possibleErrorArtifacts) {
      if (possibleErrorArtifact instanceof LHError && possibleErrorArtifact.lhrRuntimeError) {
        const errorMessage = possibleErrorArtifact.friendlyMessage || possibleErrorArtifact.message;

        return {
          code: possibleErrorArtifact.code,
          message: errorMessage,
        };
      }
    }

    return undefined;
  }

  /**
   * Returns list of audit names for external querying.
   * @return {Array<string>}
   */
  static getAuditList() {
    const ignoredFiles = [
      'audit.js',
      'violation-audit.js',
      'accessibility/axe-audit.js',
      'multi-check-audit.js',
      'byte-efficiency/byte-efficiency-audit.js',
      'manual/manual-audit.js',
    ];

    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './audits')),
      ...fs.readdirSync(path.join(__dirname, './audits/dobetterweb')).map(f => `dobetterweb/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/metrics')).map(f => `metrics/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/seo/manual')).map(f => `seo/manual/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/accessibility'))
          .map(f => `accessibility/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/accessibility/manual'))
          .map(f => `accessibility/manual/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/byte-efficiency'))
          .map(f => `byte-efficiency/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/manual')).map(f => `manual/${f}`),
    ];
    return fileList.filter(f => {
      return /\.js$/.test(f) && !ignoredFiles.includes(f);
    }).sort();
  }

  /**
   * Returns list of gatherer names for external querying.
   * @return {Array<string>}
   */
  static getGathererList() {
    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers')),
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers/dobetterweb'))
          .map(f => `dobetterweb/${f}`),
    ];
    return fileList.filter(f => /\.js$/.test(f) && f !== 'gatherer.js').sort();
  }

  /**
   * Get path to use for -G and -A modes. Defaults to $CWD/latest-run
   * @param {LH.Config.Settings} settings
   * @return {string}
   */
  static _getArtifactsPath(settings) {
    const {auditMode, gatherMode} = settings;

    // This enables usage like: -GA=./custom-folder
    if (typeof auditMode === 'string') return path.resolve(process.cwd(), auditMode);
    if (typeof gatherMode === 'string') return path.resolve(process.cwd(), gatherMode);

    return path.join(process.cwd(), 'latest-run');
  }
}

module.exports = Runner;
