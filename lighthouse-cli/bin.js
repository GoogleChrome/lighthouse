/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/*
 * The relationship between these CLI modules:
 *
 *   index.js     : only calls bin.js's begin()
 *   cli-flags.js : leverages yargs to read argv, outputs LH.CliFlags
 *   bin.js       : CLI args processing. cwd, list/print commands
 *   run.js       : chrome-launcher bits, calling lighthouse-core, output to Printer
 *
 *   index ---->    bin    ---->      run      ----> printer
 *                  ⭏  ⭎               ⭏  ⭎
 *               cli-flags        lh-core/index
 */

const commands = require('./commands/commands.js');
const printer = require('./printer.js');
const getFlags = require('./cli-flags.js').getFlags;
const runLighthouse = require('./run.js').runLighthouse;
const generateConfig = require('../lighthouse-core/index.js').generateConfig;

const log = require('lighthouse-logger');
const pkg = require('../package.json');
const Sentry = require('../lighthouse-core/lib/sentry.js');

const updateNotifier = require('update-notifier');
const askPermission = require('./sentry-prompt.js').askPermission;

/**
 * @return {boolean}
 */
function isDev() {
  return fs.existsSync(path.join(__dirname, '../.git'));
}

/**
 * @return {Promise<LH.RunnerResult|void>}
 */
async function begin() {
  // Tell user if there's a newer version of LH.
  updateNotifier({pkg}).notify();

  const cliFlags = getFlags();

  // Process terminating command
  if (cliFlags.listAllAudits) {
    commands.listAudits();
  }

  // Process terminating command
  if (cliFlags.listTraceCategories) {
    commands.listTraceCategories();
  }

  const url = cliFlags._[0];

  /** @type {LH.Config.Json|undefined} */
  let configJson;
  if (cliFlags.configPath) {
    // Resolve the config file path relative to where cli was called.
    cliFlags.configPath = path.resolve(process.cwd(), cliFlags.configPath);
    configJson = /** @type {LH.Config.Json} */ (require(cliFlags.configPath));
  } else if (cliFlags.preset) {
    configJson = require(`../lighthouse-core/config/${cliFlags.preset}-config.js`);
  }

  if (cliFlags.budgetPath) {
    cliFlags.budgetPath = path.resolve(process.cwd(), cliFlags.budgetPath);
    /** @type {Array<LH.Budget>} */
    const parsedBudget = JSON.parse(fs.readFileSync(cliFlags.budgetPath, 'utf8'));
    cliFlags.budgets = parsedBudget;
  }

  // set logging preferences
  cliFlags.logLevel = 'info';
  if (cliFlags.verbose) {
    cliFlags.logLevel = 'verbose';
  } else if (cliFlags.quiet) {
    cliFlags.logLevel = 'silent';
  }
  log.setLevel(cliFlags.logLevel);

  if (
    cliFlags.output.length === 1 &&
    cliFlags.output[0] === printer.OutputMode.json &&
    !cliFlags.outputPath
  ) {
    cliFlags.outputPath = 'stdout';
  }

  // @ts-ignore - deprecation message for removed disableDeviceEmulation; can remove warning in v6.
  if (cliFlags.disableDeviceEmulation) {
    log.warn('config', 'The "--disable-device-emulation" has been removed in v5.' +
        ' Please use "--emulated-form-factor=none" instead.');
  }

  if (typeof cliFlags.extraHeaders === 'string') {
    // TODO: LH.Flags.extraHeaders is sometimes actually a string at this point, but needs to be
    // copied over to LH.Settings.extraHeaders, which is LH.Crdp.Network.Headers. Force
    // the conversion here, but long term either the CLI flag or the setting should have
    // a different name.
    // @ts-ignore
    let extraHeadersStr = /** @type {string} */ (cliFlags.extraHeaders);
    // If not a JSON object, assume it's a path to a JSON file.
    if (extraHeadersStr.substr(0, 1) !== '{') {
      extraHeadersStr = fs.readFileSync(extraHeadersStr, 'utf-8');
    }

    cliFlags.extraHeaders = JSON.parse(extraHeadersStr);
  }

  if (cliFlags.precomputedLanternDataPath) {
    const lanternDataStr = fs.readFileSync(cliFlags.precomputedLanternDataPath, 'utf8');
    /** @type {LH.PrecomputedLanternData} */
    const data = JSON.parse(lanternDataStr);
    if (!data.additionalRttByOrigin || !data.serverResponseTimeByOrigin) {
      throw new Error('Invalid precomputed lantern data file');
    }

    cliFlags.precomputedLanternData = data;
  }

  if (cliFlags.printConfig) {
    const config = generateConfig(configJson, cliFlags);
    process.stdout.write(config.getPrintString());
    return;
  }

  // By default, cliFlags.enableErrorReporting is undefined so the user is
  // prompted. This can be overriden with an explicit flag or by the cached
  // answer returned by askPermission().
  if (typeof cliFlags.enableErrorReporting === 'undefined') {
    cliFlags.enableErrorReporting = await askPermission();
  }
  if (cliFlags.enableErrorReporting) {
    Sentry.init({
      url,
      flags: cliFlags,
      environmentData: {
        name: 'redacted', // prevent sentry from using hostname
        environment: isDev() ? 'development' : 'production',
        release: pkg.version,
        tags: {
          channel: 'cli',
        },
      },
    });
  }

  return runLighthouse(url, cliFlags, configJson);
}

module.exports = {
  begin,
};
