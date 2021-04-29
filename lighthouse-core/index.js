/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const Runner = require('./runner.js');
const log = require('lighthouse-logger');
const Config = require('./config/config.js');
const Sentry = require('./lib/sentry.js');
const assetSaver = require('./lib/asset-saver.js');
const LHError = require('./lib/lh-error.js');
const GatherRunner = require('./gather/gather-runner.js');
const URL = require('./lib/url-shim.js');
const i18n = require('./lib/i18n/i18n.js');

/** @typedef {import('./gather/connections/connection.js')} Connection */

/*
 * The relationship between these root modules:
 *
 *   index.js - the `require('lighthouse')` hook for Node modules (including the CLI, DT, and LR)
 *              marshalls the actions that must be taken (Gather / Audit)
 *              config file is used to determine which of these actions are needed
 *
 *   gather-runner.js - gathers artifacts from the brower
 *
 *   runner.js - runs audits and generates the LHR and report(s)
 *
 *         lighthouse-cli \                   / gather-runner.js [Gather]
 *                         -- core/index.js --
 *                clients /                   \ runner.js [Audit]
 */

/**
 * Run Lighthouse.
 * @param {string=} url The URL to test. Optional if running in auditMode.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @param {LH.Config.Json=} configJSON Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {Connection=} userConnection
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function lighthouse(url, flags = {}, configJSON, userConnection) {
  // set logging preferences, assume quiet
  flags.logLevel = flags.logLevel || 'error';
  log.setLevel(flags.logLevel);

  let settings;
  try {
    const indexStatus = {msg: 'lighthouse setup', id: 'lh:lighthouse'};
    log.time(indexStatus, 'verbose');

    const sentryContext = Sentry.getContext();
    Sentry.captureBreadcrumb({
      message: 'Run started',
      category: 'lifecycle',
      data: sentryContext && sentryContext.extra,
    });

    const config = generateConfig(configJSON, flags);
    settings = config.settings;

    // Gather phase.
    let artifacts;
    if (settings.auditMode && !settings.gatherMode) {
      // -A solo mode. No browser required.
      artifacts = gatherArtifactsFromDisk(settings);
    } else {
      // -G, -GA, or neither.
      // Verify the url is valid and that protocol is allowed.
      let requestedUrl;
      if (url && URL.isValid(url) && URL.isProtocolAllowed(url)) {
        // Use canonicalized URL (with trailing slashes and such)
        requestedUrl = new URL(url).href;
      } else {
        throw new LHError(LHError.errors.INVALID_URL);
      }
      const gatherOpts = {requestedUrl, flags, userConnection};
      artifacts = await GatherRunner.run(config, gatherOpts);

      // -G means save these to ./latest-run, etc.
      if (settings.gatherMode) {
        const path = getDataSavePath(settings);
        await assetSaver.saveArtifacts(artifacts, path);
      }
    }

    // Potentially quit early.
    if (settings.gatherMode && !settings.auditMode) return;

    log.timeEnd(indexStatus);

    const runnerResult = await Runner.run(artifacts, {config});

    // If -GA is used, save lhr to ./latest-run, etc.
    if (settings.gatherMode && settings.auditMode) {
      const path = getDataSavePath(settings);
      assetSaver.saveLhr(runnerResult.lhr, path);
    }

    return runnerResult;
  } catch (err) {
    // i18n LighthouseError strings.
    if (err.friendlyMessage) {
      const locale = settings ? settings.locale : i18n.DEFAULT_LOCALE;
      err.friendlyMessage = i18n.getFormatted(err.friendlyMessage, locale);
    }
    await Sentry.captureException(err, {level: 'fatal'});
    throw err;
  }
}

/**
 * Load saved artifacts from disk.
 * @param {LH.Config.Settings} settings
 * @return LH.Artifacts}
 */
function gatherArtifactsFromDisk(settings) {
  const path = getDataSavePath(settings);
  const artifacts = assetSaver.loadArtifacts(path);

  return artifacts;
}

/**
 * Get path to use for -G and -A modes. Defaults to $CWD/latest-run
 * @param {LH.Config.Settings} settings
 * @return {string}
 */
function getDataSavePath(settings) {
  const {auditMode, gatherMode} = settings;

  // This enables usage like: -GA=./custom-folder
  if (typeof auditMode === 'string') return path.resolve(process.cwd(), auditMode);
  if (typeof gatherMode === 'string') return path.resolve(process.cwd(), gatherMode);

  return path.join(process.cwd(), 'latest-run');
}

/**
 * Generate a Lighthouse Config.
 * @param {LH.Config.Json=} configJson Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @return {Config}
 */
function generateConfig(configJson, flags) {
  return new Config(configJson, flags);
}

lighthouse.generateConfig = generateConfig;
lighthouse.getAuditList = Runner.getAuditList;
lighthouse.traceCategories = require('./gather/driver.js').traceCategories;
lighthouse.Audit = require('./audits/audit.js');
lighthouse.Gatherer = require('./gather/gatherers/gatherer.js');
lighthouse.NetworkRecords = require('./computed/network-records.js');

module.exports = lighthouse;
