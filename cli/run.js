/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import os from 'os';

import * as ChromeLauncher from 'chrome-launcher';
import yargsParser from 'yargs-parser';
import log from 'lighthouse-logger';
import open from 'open';

import * as Printer from './printer.js';
import lighthouse from '../core/index.js';
import {getLhrFilenamePrefix} from '../report/generator/file-namer.js';
import * as assetSaver from '../core/lib/asset-saver.js';
import UrlUtils from '../core/lib/url-utils.js';

/** @typedef {Error & {code: string, friendlyMessage?: string}} ExitError */

const _RUNTIME_ERROR_CODE = 1;
const _PROTOCOL_TIMEOUT_EXIT_CODE = 67;

/**
 * exported for testing
 * @param {string|Array<string>} flags
 * @return {Array<string>}
 */
function parseChromeFlags(flags = '') {
  // flags will be a string if there is only one chrome-flag parameter:
  // i.e. `lighthouse --chrome-flags="--user-agent='My Agent' --headless"`
  // flags will be an array if there are multiple chrome-flags parameters
  // i.e. `lighthouse --chrome-flags="--user-agent='My Agent'" --chrome-flags="--headless"`
  const trimmedFlags = (Array.isArray(flags) ? flags : [flags])
      // `child_process.execFile` and other programmatic invocations will pass Lighthouse arguments atomically.
      // Many developers aren't aware of this and attempt to pass arguments to LH as they would to a shell `--chromeFlags="--headless --no-sandbox"`.
      // In this case, yargs will see `"--headless --no-sandbox"` and treat it as a single argument instead of the intended `--headless --no-sandbox`.
      // We remove quotes that surround the entire expression to make this work.
      // i.e. `child_process.execFile("lighthouse", ["http://google.com", "--chrome-flags='--headless --no-sandbox'")`
      // the following regular expression removes those wrapping quotes:
      .map((flagsGroup) => flagsGroup.replace(/^\s*('|")(.+)\1\s*$/, '$2').trim())
      .join(' ').trim();

  const parsed = yargsParser(trimmedFlags, {
    configuration: {'camel-case-expansion': false, 'boolean-negation': false},
  });

  return Object
      .keys(parsed)
      // Remove unnecessary _ item provided by yargs,
      .filter(key => key !== '_')
      // Avoid '=true', then reintroduce quotes
      .map(key => {
        if (parsed[key] === true) return `--${key}`;
        // ChromeLauncher passes flags to Chrome as atomic arguments, so do not double quote
        // i.e. `lighthouse --chrome-flags="--user-agent='My Agent'"` becomes `chrome "--user-agent=My Agent"`
        // see https://github.com/GoogleChrome/lighthouse/issues/3744
        return `--${key}=${parsed[key]}`;
      });
}

/**
 * Attempts to connect to an instance of Chrome with an open remote-debugging
 * port. If none is found, launches a debuggable instance.
 * @param {LH.CliFlags} flags
 * @return {Promise<ChromeLauncher.LaunchedChrome>}
 */
function getDebuggableChrome(flags) {
  if (process.platform === 'darwin' && process.arch === 'x64') {
    const cpus = os.cpus();
    if (cpus[0].model.includes('Apple')) {
      throw new Error(
        'Launching Chrome on Mac Silicon (arm64) from an x64 Node installation results in ' +
        'Rosetta translating the Chrome binary, even if Chrome is already arm64. This would ' +
        'result in huge performance issues. To resolve this, you must run Lighthouse CLI with ' +
        'a version of Node built for arm64. You should also confirm that your Chrome install ' +
        'says arm64 in chrome://version');
    }
  }

  return ChromeLauncher.launch({
    port: flags.port,
    ignoreDefaultFlags: flags.chromeIgnoreDefaultFlags,
    chromeFlags: parseChromeFlags(flags.chromeFlags),
    logLevel: flags.logLevel,
  });
}

/** @return {never} */
function printConnectionErrorAndExit() {
  console.error('Unable to connect to Chrome');
  return process.exit(_RUNTIME_ERROR_CODE);
}

/** @return {never} */
function printProtocolTimeoutErrorAndExit() {
  console.error('Debugger protocol timed out while connecting to Chrome.');
  return process.exit(_PROTOCOL_TIMEOUT_EXIT_CODE);
}

/**
 * @param {ExitError} err
 * @return {never}
 */
function printRuntimeErrorAndExit(err) {
  console.error('Runtime error encountered:', err.friendlyMessage || err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  return process.exit(_RUNTIME_ERROR_CODE);
}

/**
 * @param {ExitError} err
 * @return {never}
 */
function printErrorAndExit(err) {
  if (err.code === 'ECONNREFUSED') {
    return printConnectionErrorAndExit();
  } else if (err.code === 'CRI_TIMEOUT') {
    return printProtocolTimeoutErrorAndExit();
  } else {
    return printRuntimeErrorAndExit(err);
  }
}

/**
 * @param {LH.RunnerResult} runnerResult
 * @param {LH.CliFlags} flags
 * @return {Promise<string|undefined>}
 */
async function saveResults(runnerResult, flags) {
  const cwd = process.cwd();

  if (flags.lanternDataOutputPath) {
    const devtoolsLog = runnerResult.artifacts.DevtoolsLog;
    await assetSaver.saveLanternNetworkData(devtoolsLog, flags.lanternDataOutputPath);
  }

  const shouldSaveResults = flags.auditMode || (flags.gatherMode === flags.auditMode);
  if (!shouldSaveResults) return;
  const {lhr, artifacts, report} = runnerResult;

  const isDirectoryOutput = Boolean(
    flags.outputPath &&
    fs.existsSync(flags.outputPath) &&
    fs.statSync(flags.outputPath).isDirectory()
  );

  // Use the output path as the prefix for all generated files.
  // If no output path is set, generate a file prefix using the URL and date.
  let configuredPath;
  if (!flags.outputPath || flags.outputPath === 'stdout') {
    configuredPath = getLhrFilenamePrefix(lhr);
  } else if (isDirectoryOutput) {
    configuredPath = path.join(flags.outputPath, getLhrFilenamePrefix(lhr));
  } else {
    configuredPath = flags.outputPath.replace(/\.\w{2,4}$/, '');
  }
  const resolvedPath = path.resolve(cwd, configuredPath);

  if (flags.saveAssets) {
    await assetSaver.saveAssets(artifacts, lhr.audits, resolvedPath);
  }

  /** @type {string|undefined} */
  let htmlOutputPath;
  for (const outputType of flags.output) {
    const extension = outputType;
    const output = report[flags.output.indexOf(outputType)];
    let outputPath = `${resolvedPath}.report.${extension}`;
    // If there was only a single output and the user specified a file outputPath, force usage of it.
    if (flags.outputPath && !isDirectoryOutput && flags.output.length === 1) {
      outputPath = flags.outputPath;
    }
    await Printer.write(output, outputType, outputPath);

    if (outputType === Printer.OutputMode[Printer.OutputMode.html]) {
      htmlOutputPath = outputPath;
    }
  }

  return htmlOutputPath;
}

/**
 * @param {string|string[]|undefined} urlOrUrls
 * @param {LH.CliFlags} flags
 * @param {LH.Config|undefined} config
 * @return {Promise<LH.RunnerResult|LH.RunnerResult[]|undefined>}
 */
async function runLighthouse(urlOrUrls, flags, config) {
  /** @param {any} reason */
  function handleTheUnhandled(reason) {
    process.stderr.write(`Unhandled Rejection. Reason: ${reason}\n`);
    launchedChrome?.kill();
    process.exit(1);
  }
  process.on('unhandledRejection', handleTheUnhandled);

  /** @type {ChromeLauncher.LaunchedChrome|undefined} */
  let launchedChrome;

  const urls = [urlOrUrls].flat();
  if (urls.length === 0) urls.push(undefined);
  const isBatch = urls.length > 1;

  const shouldGather = flags.gatherMode || flags.gatherMode === flags.auditMode;
  const shouldUseLocalChrome = UrlUtils.isLikeLocalhost(flags.hostname);
  const initialPort = flags.port;
  flags.channel = 'cli';

  /** @type {Array<LH.RunnerResult>} */
  const results = [];
  /** @type {Array<string>} */
  const htmlReportPaths = [];
  /** @type {Array<ExitError>} */
  const errors = [];

  try {
    for (const url of urls) {
      if (url && flags.auditMode && !flags.gatherMode) {
        log.warn('CLI', 'URL parameter is ignored if -A flag is used without -G flag');
      }

      try {
        if (shouldGather && shouldUseLocalChrome && !launchedChrome) {
          launchedChrome = await getDebuggableChrome({...flags, port: initialPort});
          flags.port = launchedChrome.port;
        }

        const runnerResult = await lighthouse(url, flags, config);

        // If in gatherMode only, there will be no runnerResult.
        if (runnerResult) {
          const htmlPath = await saveResults(runnerResult, flags);
          if (htmlPath) htmlReportPaths.push(htmlPath);
          results.push(runnerResult);
        }

        // Runtime errors indicate something was *very* wrong with the page result.
        // We don't want the user to have to parse the report to figure it out, so we'll still exit
        // with an error code after we saved the results.
        if (runnerResult?.lhr.runtimeError) {
          const {runtimeError} = runnerResult.lhr;
          throw Object.assign(new Error(runtimeError.message), {
            name: 'LighthouseError',
            friendlyMessage: runtimeError.message,
            code: runtimeError.code,
            stack: undefined,
          });
        }
      } catch (err) {
        errors.push(err);
        await launchedChrome?.kill();
        launchedChrome = undefined;
        if (!isBatch || flags.failFast) break;
        const errMsg = err.friendlyMessage || err.message;
        log.error('CLI', `Runtime error encountered for ${url}: ${errMsg}`);
      }
    }
  } finally {
    await launchedChrome?.kill();
    process.removeListener('unhandledRejection', handleTheUnhandled);
  }

  if (htmlReportPaths.length > 0) {
    if (flags.view) {
      for (const htmlPath of htmlReportPaths) {
        open(htmlPath, {wait: false});
      }
    } else {
      // eslint-disable-next-line max-len
      log.log('CLI', 'Protip: Run lighthouse with `--view` to immediately open the HTML report in your browser');
    }
  }

  if (errors.length > 0) {
    return printErrorAndExit(errors[0]);
  }

  return isBatch ? results : results[0];
}

export {
  parseChromeFlags,
  saveResults,
  runLighthouse,
};
