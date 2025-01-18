/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The relationship between these CLI modules:
 *
 *   index.js     : only calls bin.js's begin()
 *   cli-flags.js : leverages yargs to read argv, outputs LH.CliFlags
 *   bin.js       : CLI args processing. cwd, list/print commands
 *   run.js       : chrome-launcher bits, calling core, output to Printer
 *
 *   index ---->    bin    ---->      run      ----> printer
 *                  ⭏  ⭎               ⭏  ⭎
 *               cli-flags        lh-core/index
 */

import fs from 'fs';
import path from 'path';
import url from 'url';

import log from 'lighthouse-logger';

import * as commands from './commands/commands.js';
import * as Printer from './printer.js';
import {getFlags} from './cli-flags.js';
import {runLighthouse} from './run.js';
import {askPermission} from './sentry-prompt.js';
import {LH_ROOT} from '../shared/root.js';
import {Sentry} from '../core/lib/sentry.js';

const pkg = JSON.parse(fs.readFileSync(LH_ROOT + '/package.json', 'utf-8'));

/**
 * @return {boolean}
 */
function isDev() {
  return fs.existsSync(path.join(LH_ROOT, '/.git'));
}

/**
 * @return {Promise<LH.RunnerResult|void>}
 */
async function begin() {
  const cliFlags = getFlags();

  // Process terminating command
  if (cliFlags.listAllAudits) {
    commands.listAudits();
  }

  // Process terminating command
  if (cliFlags.listLocales) {
    commands.listLocales();
  }

  // Process terminating command
  if (cliFlags.listTraceCategories) {
    commands.listTraceCategories();
  }

  const urlUnderTest = cliFlags._[0];

  /** @type {LH.Config|undefined} */
  let config;
  if (cliFlags.configPath) {
    // Resolve the config file path relative to where cli was called.
    cliFlags.configPath = path.resolve(process.cwd(), cliFlags.configPath);

    if (cliFlags.configPath.endsWith('.json')) {
      config = JSON.parse(fs.readFileSync(cliFlags.configPath, 'utf-8'));
    } else {
      const configModuleUrl = url.pathToFileURL(cliFlags.configPath).href;
      config = (await import(configModuleUrl)).default;
    }
  } else if (cliFlags.preset) {
    config = (await import(`../core/config/${cliFlags.preset}-config.js`)).default;
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
    cliFlags.output[0] === Printer.OutputMode.json &&
    !cliFlags.outputPath
  ) {
    cliFlags.outputPath = 'stdout';
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

  // By default, cliFlags.enableErrorReporting is undefined so the user is
  // prompted. This can be overridden with an explicit flag or by the cached
  // answer returned by askPermission().
  if (typeof cliFlags.enableErrorReporting === 'undefined') {
    cliFlags.enableErrorReporting = await askPermission();
  }
  if (cliFlags.enableErrorReporting) {
    await Sentry.init({
      url: urlUnderTest,
      flags: cliFlags,
      config,
      environmentData: {
        serverName: 'redacted', // prevent sentry from using hostname
        environment: isDev() ? 'development' : 'production',
        release: pkg.version,
      },
    });
  }

  return runLighthouse(urlUnderTest, cliFlags, config);
}

export {
  begin,
};
