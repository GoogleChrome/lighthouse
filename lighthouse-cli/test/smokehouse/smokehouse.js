#!/usr/bin/env node
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const yargs = require('yargs');
const log = require('lighthouse-logger');
const rimraf = require('rimraf');

const {collateResults, report} = require('./smokehouse-report.js');
const assetSaver = require('../../../lighthouse-core/lib/asset-saver.js');

const PROTOCOL_TIMEOUT_EXIT_CODE = 67;
const RETRIES = 3;

/**
 * Attempt to resolve a path locally. If this fails, attempts to locate the path
 * relative to the current working directory.
 * @param {string} payloadPath
 * @return {string}
 */
function resolveLocalOrCwd(payloadPath) {
  let resolved;
  try {
    resolved = require.resolve('./' + payloadPath);
  } catch (e) {
    const cwdPath = path.resolve(process.cwd(), payloadPath);
    resolved = require.resolve(cwdPath);
  }

  return resolved;
}

/**
 * Launch Chrome and do a full Lighthouse run.
 * @param {string} url
 * @param {string} configPath
 * @param {string=} cliFlagsPath
 * @param {boolean=} isDebug
 * @return {Smokehouse.ExpectedRunnerResult}
 */
function runLighthouse(url, configPath, cliFlagsPath, isDebug) {
  isDebug = isDebug || Boolean(process.env.LH_SMOKE_DEBUG);

  const command = 'node';
  const randInt = Math.round(Math.random() * 100000);
  const outputPath = `smokehouse-${randInt}.report.json`;
  const artifactsDirectory = `./.tmp/smokehouse-artifacts-${randInt}`;
  const args = [
    'lighthouse-cli/index.js',
    url,
    `--config-path=${configPath}`,
    cliFlagsPath ? `--cli-flags-path=${cliFlagsPath}` : '',
    `--output-path=${outputPath}`,
    '--output=json',
    `-G=${artifactsDirectory}`,
    `-A=${artifactsDirectory}`,
    '--quiet',
    '--port=0',
  ];

  if (process.env.APPVEYOR) {
    // Appveyor is hella slow already, disable CPU throttling so we're not 16x slowdown
    // see https://github.com/GoogleChrome/lighthouse/issues/4891
    args.push('--throttling.cpuSlowdownMultiplier=1');
  }

  // Lighthouse sometimes times out waiting to for a connection to Chrome in CI.
  // Watch for this error and retry relaunching Chrome and running Lighthouse up
  // to RETRIES times. See https://github.com/GoogleChrome/lighthouse/issues/833
  let runResults;
  let runCount = 0;
  do {
    if (runCount > 0) {
      console.log('  Lighthouse error: timed out waiting for debugger connection. Retrying...');
    }

    runCount++;
    console.log(`${log.dim}$ ${command} ${args.join(' ')} ${log.reset}`);
    runResults = spawnSync(command, args, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit']});
  } while (runResults.status === PROTOCOL_TIMEOUT_EXIT_CODE && runCount <= RETRIES);

  if (isDebug) {
    console.log(`STDOUT: ${runResults.stdout}`);
    console.error(`STDERR: ${runResults.stderr}`);
  }

  const exitCode = runResults.status;
  if (exitCode === PROTOCOL_TIMEOUT_EXIT_CODE) {
    console.error(`Lighthouse debugger connection timed out ${RETRIES} times. Giving up.`);
    process.exit(1);
  } else if (!fs.existsSync(outputPath)) {
    console.error(`Lighthouse run failed to produce a report and exited with ${exitCode}. stderr to follow:`); // eslint-disable-line max-len
    console.error(runResults.stderr);
    process.exit(exitCode);
  }

  /** @type {LH.Result} */
  const lhr = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const artifacts = assetSaver.loadArtifacts(artifactsDirectory);

  if (isDebug) {
    console.log('LHR output available at: ', outputPath);
    console.log('Artifacts avaiable in: ', artifactsDirectory);
  } else {
    fs.unlinkSync(outputPath);
    rimraf.sync(artifactsDirectory);
  }

  // There should either be both an error exitCode and a lhr.runtimeError or neither.
  if (Boolean(exitCode) !== Boolean(lhr.runtimeError)) {
    const runtimeErrorCode = lhr.runtimeError && lhr.runtimeError.code;
    console.error(`Lighthouse did not exit with an error correctly, exiting with ${exitCode} but with runtimeError '${runtimeErrorCode}'`); // eslint-disable-line max-len
    process.exit(1);
  }

  return {
    lhr,
    artifacts,
  };
}

const cli = yargs
  .help('help')
  .describe({
    'config-path': 'The path to the config JSON file',
    'cli-flags-path': 'The path to the CLI flags JSON file',
    'expectations-path': 'The path to the expected audit results file',
    'debug': 'Save the artifacts along with the output',
  })
  .require('config-path', true)
  .require('expectations-path', true)
  .argv;

const configPath = resolveLocalOrCwd(cli['config-path']);
const cliFlagsPath = cli['cli-flags-path'] ? resolveLocalOrCwd(cli['cli-flags-path']) : undefined;
/** @type {Smokehouse.ExpectedRunnerResult[]} */
const expectations = require(resolveLocalOrCwd(cli['expectations-path']));

// Loop sequentially over expectations, comparing against Lighthouse run, and
// reporting result.
let passingCount = 0;
let failingCount = 0;
expectations.forEach(expected => {
  console.log(`Doing a run of '${expected.lhr.requestedUrl}'...`);
  const results = runLighthouse(expected.lhr.requestedUrl, configPath, cliFlagsPath, cli.debug);

  console.log(`Asserting expected results match those found. (${expected.lhr.requestedUrl})`);
  const collated = collateResults(results, expected);
  const counts = report(collated);
  passingCount += counts.passed;
  failingCount += counts.failed;
});

if (passingCount) {
  console.log(log.greenify(`${passingCount} passing`));
}
if (failingCount) {
  console.log(log.redify(`${failingCount} failing`));
  process.exit(1);
}
