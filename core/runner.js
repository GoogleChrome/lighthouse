/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';


import log from 'lighthouse-logger';
import isDeepEqual from 'lodash/isEqual.js';

import {ReportScoring} from './scoring.js';
import {Audit} from './audits/audit.js';
import * as format from '../shared/localization/format.js';
import * as stackPacks from './lib/stack-packs.js';
import * as assetSaver from './lib/asset-saver.js';
import {Sentry} from './lib/sentry.js';
import {ReportGenerator} from '../report/generator/report-generator.js';
import {LighthouseError} from './lib/lh-error.js';
import {lighthouseVersion} from '../shared/root.js';
import {getModuleDirectory} from '../shared/esm-utils.js';
import {EntityClassification} from './computed/entity-classification.js';
import UrlUtils from './lib/url-utils.js';

const moduleDir = getModuleDirectory(import.meta);

/** @typedef {import('./lib/arbitrary-equality-map.js').ArbitraryEqualityMap} ArbitraryEqualityMap */

class Runner {
  /**
   * @param {LH.Artifacts} artifacts
   * @param {{resolvedConfig: LH.Config.ResolvedConfig, computedCache: Map<string, ArbitraryEqualityMap>}} options
   * @return {Promise<LH.RunnerResult|undefined>}
   */
  static async audit(artifacts, options) {
    const {resolvedConfig, computedCache} = options;
    const settings = resolvedConfig.settings;

    try {
      const runnerStatus = {msg: 'Audit phase', id: 'lh:runner:audit'};
      log.time(runnerStatus, 'verbose');

      /**
       * List of top-level warnings for this Lighthouse run.
       * @type {Array<string | LH.IcuMessage>}
       */
      const lighthouseRunWarnings = [];

      // Potentially quit early
      if (settings.gatherMode && !settings.auditMode) return;

      if (!resolvedConfig.audits) {
        throw new Error('No audits to evaluate.');
      }
      const auditResultsById = await Runner._runAudits(settings, resolvedConfig.audits, artifacts,
          lighthouseRunWarnings, computedCache);

      // LHR construction phase
      const resultsStatus = {msg: 'Generating results...', id: 'lh:runner:generate'};
      log.time(resultsStatus);

      if (artifacts.LighthouseRunWarnings) {
        lighthouseRunWarnings.push(...artifacts.LighthouseRunWarnings);
      }

      // Entering: conclusion of the lighthouse result object

      // Use version from gathering stage.
      // If accessibility gatherer didn't run or errored, it won't be in credits.
      const axeVersion = artifacts.Accessibility?.version;
      const credits = {
        'axe-core': axeVersion,
      };

      /** @type {Record<string, LH.RawIcu<LH.Result.Category>>} */
      let categories = {};
      if (resolvedConfig.categories) {
        categories = ReportScoring.scoreAllCategories(resolvedConfig.categories, auditResultsById);
      }

      log.timeEnd(resultsStatus);
      log.timeEnd(runnerStatus);

      /** @type {LH.Artifacts['FullPageScreenshot']|undefined} */
      let fullPageScreenshot = artifacts.FullPageScreenshot;
      if (resolvedConfig.settings.disableFullPageScreenshot ||
          fullPageScreenshot instanceof Error) {
        fullPageScreenshot = undefined;
      }

      /** @type {LH.RawIcu<LH.Result>} */
      const i18nLhr = {
        lighthouseVersion,
        requestedUrl: artifacts.URL.requestedUrl,
        mainDocumentUrl: artifacts.URL.mainDocumentUrl,
        finalDisplayedUrl: artifacts.URL.finalDisplayedUrl,
        finalUrl: artifacts.URL.mainDocumentUrl,
        fetchTime: artifacts.fetchTime,
        gatherMode: artifacts.GatherContext.gatherMode,
        runtimeError: Runner.getArtifactRuntimeError(artifacts),
        runWarnings: lighthouseRunWarnings,
        userAgent: artifacts.HostUserAgent,
        environment: {
          networkUserAgent: artifacts.NetworkUserAgent,
          hostUserAgent: artifacts.HostUserAgent,
          benchmarkIndex: artifacts.BenchmarkIndex,
          credits,
        },
        audits: auditResultsById,
        configSettings: settings,
        categories,
        categoryGroups: resolvedConfig.groups || undefined,
        stackPacks: stackPacks.getStackPacks(artifacts.Stacks),
        entities: await Runner.getEntityClassification(artifacts, {computedCache}),
        fullPageScreenshot,
        timing: this._getTiming(artifacts),
        i18n: {
          rendererFormattedStrings: format.getRendererFormattedStrings(settings.locale),
          icuMessagePaths: {},
        },
      };

      // Replace ICU message references with localized strings; save replaced paths in lhr.
      i18nLhr.i18n.icuMessagePaths = format.replaceIcuMessages(i18nLhr, settings.locale);

      // LHR has now been localized.
      const lhr = /** @type {LH.Result} */ (i18nLhr);

      if (settings.auditMode) {
        const path = Runner._getDataSavePath(settings);
        assetSaver.saveLhr(lhr, path);
      }

      // Create the HTML, JSON, and/or CSV string
      const report = ReportGenerator.generateReport(lhr, settings.output);

      return {lhr, artifacts, report};
    } catch (err) {
      throw Runner.createRunnerError(err, settings);
    }
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Artifacts.ComputedContext} context
   */
  static async getEntityClassification(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs?.[Audit.DEFAULT_PASS];
    if (!devtoolsLog) return;
    const classifiedEntities = await EntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);

    /** @type {Array<LH.Result.LhrEntity>} */
    const entities = [];
    for (const [entity, entityUrls] of classifiedEntities.urlsByEntity) {
      const uniqueOrigins = new Set();
      for (const url of entityUrls) {
        const origin = UrlUtils.getOrigin(url);
        if (origin) uniqueOrigins.add(origin);
      }

      /** @type {LH.Result.LhrEntity} */
      const shortEntity = {
        name: entity.name,
        homepage: entity.homepage,
        origins: [...uniqueOrigins],
      };
      // Reduce payload size in LHR JSON by omitting whats falsy.
      if (entity === classifiedEntities.firstParty) shortEntity.isFirstParty = true;
      if (entity.isUnrecognized) shortEntity.isUnrecognized = true;
      if (entity.category) shortEntity.category = entity.category;
      entities.push(shortEntity);
    }

    return entities;
  }

  /**
   * User can run -G solo, -A solo, or -GA together
   * -G and -A will run partial lighthouse pipelines,
   * and -GA will run everything plus save artifacts and lhr to disk.
   *
   * @param {(runnerData: {resolvedConfig: LH.Config.ResolvedConfig}) => Promise<LH.Artifacts>} gatherFn
   * @param {{resolvedConfig: LH.Config.ResolvedConfig, computedCache: Map<string, ArbitraryEqualityMap>}} options
   * @return {Promise<LH.Artifacts>}
   */
  static async gather(gatherFn, options) {
    const settings = options.resolvedConfig.settings;

    // Either load saved artifacts from disk or from the browser.
    try {
      const sentryContext = Sentry.getContext();
      Sentry.captureBreadcrumb({
        message: 'Run started',
        category: 'lifecycle',
        data: sentryContext,
      });

      if (settings.auditMode && !settings.gatherMode) {
        // No browser required, just load the artifacts from disk.
        const path = this._getDataSavePath(settings);
        return assetSaver.loadArtifacts(path);
      }

      const runnerStatus = {msg: 'Gather phase', id: 'lh:runner:gather'};
      log.time(runnerStatus, 'verbose');

      const artifacts = await gatherFn({resolvedConfig: options.resolvedConfig});
      log.timeEnd(runnerStatus);

      // If `gather` is run multiple times before `audit`, the timing entries for each `gather` can pollute one another.
      // We need to clear the timing entries at the end of gathering.
      // Set artifacts.Timing again to ensure lh:runner:gather is included.
      artifacts.Timing = log.takeTimeEntries();

      // -G means save these to disk (e.g. ./latest-run).
      if (settings.gatherMode) {
        const path = this._getDataSavePath(settings);
        await assetSaver.saveArtifacts(artifacts, path);
      }

      return artifacts;
    } catch (err) {
      throw Runner.createRunnerError(err, settings);
    }
  }

  /**
   * @param {any} err
   * @param {LH.Config.Settings} settings
   */
  static createRunnerError(err, settings) {
    // i18n LighthouseError strings.
    if (err.friendlyMessage) {
      err.friendlyMessage = format.getFormatted(err.friendlyMessage, settings.locale);
    }
    Sentry.captureException(err, {level: 'fatal'});
    return err;
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
    ].map(entry => /** @type {[string, PerformanceEntry]} */ ([
      // As entries can share a name and start time, dedupe based on the name, startTime and duration
      `${entry.startTime}-${entry.name}-${entry.duration}`,
      entry,
    ]));
    const timingEntries = Array.from(new Map(timingEntriesKeyValues).values())
    // Truncate timestamps to hundredths of a millisecond saves ~4KB. No need for microsecond
    // resolution.
    .map(entry => {
      return {
        // Don't spread entry because browser PerformanceEntries can't be spread.
        // https://github.com/GoogleChrome/lighthouse/issues/8638
        startTime: parseFloat(entry.startTime.toFixed(2)),
        name: entry.name,
        duration: parseFloat(entry.duration.toFixed(2)),
        entryType: entry.entryType,
      };
    }).sort((a, b) => a.startTime - b.startTime);
    const gatherEntry = timingEntries.find(e => e.name === 'lh:runner:gather');
    const auditEntry = timingEntries.find(e => e.name === 'lh:runner:audit');
    const gatherTiming = gatherEntry?.duration || 0;
    const auditTiming = auditEntry?.duration || 0;
    return {entries: timingEntries, total: gatherTiming + auditTiming};
  }

  /**
   * Run all audits with specified settings and artifacts.
   * @param {LH.Config.Settings} settings
   * @param {Array<LH.Config.AuditDefn>} audits
   * @param {LH.Artifacts} artifacts
   * @param {Array<string | LH.IcuMessage>} runWarnings
   * @param {Map<string, ArbitraryEqualityMap>} computedCache
   * @return {Promise<Record<string, LH.RawIcu<LH.Audit.Result>>>}
   */
  static async _runAudits(settings, audits, artifacts, runWarnings, computedCache) {
    const status = {msg: 'Analyzing and running audits...', id: 'lh:runner:auditing'};
    log.time(status);

    if (artifacts.settings) {
      const overrides = {
        locale: undefined,
        gatherMode: undefined,
        auditMode: undefined,
        output: undefined,
        channel: undefined,
      };
      const normalizedGatherSettings = Object.assign({}, artifacts.settings, overrides);
      const normalizedAuditSettings = Object.assign({}, settings, overrides);

      // First, try each key individually so we can print which key differed.
      const keys = new Set([
        ...Object.keys(normalizedGatherSettings),
        ...Object.keys(normalizedAuditSettings),
      ]);
      for (const k of keys) {
        if (!isDeepEqual(normalizedGatherSettings[k], normalizedAuditSettings[k])) {
          throw new Error(
            `Cannot change settings between gathering and auditing…
Difference found at: \`${k}\`
    ${normalizedGatherSettings[k]}
vs
    ${normalizedAuditSettings[k]}`);
        }
      }

      // Call `isDeepEqual` on the entire thing, just in case something was missed.
      if (!isDeepEqual(normalizedGatherSettings, normalizedAuditSettings)) {
        throw new Error('Cannot change settings between gathering and auditing');
      }
    }

    // Members of LH.Audit.Context that are shared across all audits.
    const sharedAuditContext = {
      settings,
      computedCache,
    };

    // Run each audit sequentially
    /** @type {Record<string, LH.RawIcu<LH.Audit.Result>>} */
    const auditResultsById = {};
    for (const auditDefn of audits) {
      const auditId = auditDefn.implementation.meta.id;
      const auditResult = await Runner._runAudit(auditDefn, artifacts, sharedAuditContext,
          runWarnings);
      auditResultsById[auditId] = auditResult;
    }

    log.timeEnd(status);
    return auditResultsById;
  }

  /**
   * Checks that the audit's required artifacts exist and runs the audit if so.
   * Otherwise returns error audit result.
   * @param {LH.Config.AuditDefn} auditDefn
   * @param {LH.Artifacts} artifacts
   * @param {Pick<LH.Audit.Context, 'settings'|'computedCache'>} sharedAuditContext
   * @param {Array<string | LH.IcuMessage>} runWarnings
   * @return {Promise<LH.RawIcu<LH.Audit.Result>>}
   * @private
   */
  static async _runAudit(auditDefn, artifacts, sharedAuditContext, runWarnings) {
    const audit = auditDefn.implementation;
    const status = {
      msg: `Auditing: ${format.getFormatted(audit.meta.title, 'en-US')}`,
      id: `lh:audit:${audit.meta.id}`,
    };
    log.time(status);

    let auditResult;
    try {
      if (artifacts.PageLoadError) throw artifacts.PageLoadError;

      // Return an early error if an artifact required for the audit is missing or an error.
      for (const artifactName of audit.meta.requiredArtifacts) {
        const noArtifact = artifacts[artifactName] === undefined;

        // If trace/devtoolsLog required, check that DEFAULT_PASS trace/devtoolsLog exists.
        // NOTE: for now, not a pass-specific check of traces or devtoolsLogs.
        const noRequiredTrace = artifactName === 'traces' &&
          !artifacts.traces?.[Audit.DEFAULT_PASS];
        const noRequiredDevtoolsLog = artifactName === 'devtoolsLogs' &&
          !artifacts.devtoolsLogs?.[Audit.DEFAULT_PASS];

        if (noArtifact || noRequiredTrace || noRequiredDevtoolsLog) {
          log.warn('Runner',
              `${artifactName} gatherer, required by audit ${audit.meta.id}, did not run.`);
          throw new LighthouseError(
            LighthouseError.errors.MISSING_REQUIRED_ARTIFACT, {artifactName});
        }

        // If artifact was an error, output error result on behalf of audit.
        if (artifacts[artifactName] instanceof Error) {
          /** @type {Error} */
          const artifactError = artifacts[artifactName];

          log.warn('Runner', `${artifactName} gatherer, required by audit ${audit.meta.id},` +
            ` encountered an error: ${artifactError.message}`);

          // Create a friendlier display error and mark it as expected to avoid duplicates in Sentry.
          // The artifact error was already sent to Sentry in `collectPhaseArtifacts`.
          const error = new LighthouseError(LighthouseError.errors.ERRORED_REQUIRED_ARTIFACT,
              {artifactName, errorMessage: artifactError.message}, {cause: artifactError});
          // @ts-expect-error Non-standard property added to Error
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
          // @ts-expect-error tsc can't yet express that artifactName is only a single type in each iteration, not a union of types.
          narrowedArtifacts[artifactName] = requestedArtifact;
          return narrowedArtifacts;
        }, /** @type {LH.Artifacts} */ ({}));
      const product = await audit.audit(narrowedArtifacts, auditContext);
      runWarnings.push(...(product.runWarnings || []));

      auditResult = Audit.generateAuditResult(audit, product);
    } catch (err) {
      // Log error if it hasn't already been logged above.
      if (err.code !== 'MISSING_REQUIRED_ARTIFACT' && err.code !== 'ERRORED_REQUIRED_ARTIFACT') {
        log.warn(audit.meta.id, `Caught exception: ${err.message}`);
      }

      Sentry.captureException(err, {tags: {audit: audit.meta.id}, level: 'error'});
      // Errors become error audit result.
      const errorMessage = err.friendlyMessage ? err.friendlyMessage : err.message;
      // Prefer the stack trace closest to the error.
      const stack = err.cause?.stack ?? err.stack;
      auditResult = Audit.generateErrorAuditResult(audit, errorMessage, stack);
    }

    log.timeEnd(status);
    return auditResult;
  }

  /**
   * Searches a pass's artifacts for any `lhrRuntimeError` error artifacts.
   * Returns the first one found or `null` if none found.
   * @param {LH.Artifacts} artifacts
   * @return {LH.RawIcu<LH.Result['runtimeError']>|undefined}
   */
  static getArtifactRuntimeError(artifacts) {
    const possibleErrorArtifacts = [
      artifacts.PageLoadError, // Preferentially use `PageLoadError`, if it exists.
      ...Object.values(artifacts), // Otherwise check amongst all artifacts.
    ];

    for (const possibleErrorArtifact of possibleErrorArtifacts) {
      const isError = possibleErrorArtifact instanceof LighthouseError;

      // eslint-disable-next-line max-len
      if (isError && possibleErrorArtifact.lhrRuntimeError) {
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
      ...fs.readdirSync(path.join(moduleDir, './audits')),
      ...fs.readdirSync(path.join(moduleDir, './audits/dobetterweb')).map(f => `dobetterweb/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './audits/metrics')).map(f => `metrics/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './audits/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './audits/seo/manual')).map(f => `seo/manual/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './audits/accessibility'))
          .map(f => `accessibility/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './audits/accessibility/manual'))
          .map(f => `accessibility/manual/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './audits/byte-efficiency'))
          .map(f => `byte-efficiency/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './audits/manual')).map(f => `manual/${f}`),
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
      ...fs.readdirSync(path.join(moduleDir, './gather/gatherers')),
      ...fs.readdirSync(path.join(moduleDir, './gather/gatherers/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(moduleDir, './gather/gatherers/dobetterweb'))
          .map(f => `dobetterweb/${f}`),
    ];
    return fileList.filter(f => /\.js$/.test(f) && f !== 'gatherer.js').sort();
  }

  /**
   * Get path to use for -G and -A modes. Defaults to $CWD/latest-run
   * @param {LH.Config.Settings} settings
   * @return {string}
   */
  static _getDataSavePath(settings) {
    const {auditMode, gatherMode} = settings;

    // This enables usage like: -GA=./custom-folder
    if (typeof auditMode === 'string') return path.resolve(process.cwd(), auditMode);
    if (typeof gatherMode === 'string') return path.resolve(process.cwd(), gatherMode);

    return path.join(process.cwd(), 'latest-run');
  }
}

export {Runner};
