/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview  A runner that executes Lighthouse via the Lighthouse CLI to
 * test the full pipeline, from parsing arguments on the command line to writing
 * results to disk. When complete, reads back the artifacts and LHR and returns
 * them.
 */

import {promises as fs} from 'fs';
import {promisify} from 'util';
import {execFile} from 'child_process';

import log from 'lighthouse-logger';

import * as assetSaver from '../../../../core/lib/asset-saver.js';
import {LocalConsole} from '../lib/local-console.js';
import {ChildProcessError} from '../lib/child-process-error.js';
import {LH_ROOT} from '../../../../shared/root.js';

const execFileAsync = promisify(execFile);

/**
 * Launch Chrome and do a full Lighthouse run via the Lighthouse CLI.
 * @param {string} url
 * @param {LH.Config=} config
 * @param {LocalConsole=} logger
 * @param {Smokehouse.SmokehouseOptions['testRunnerOptions']=} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts}>}
 */
async function runLighthouse(url, config, logger, testRunnerOptions = {}) {
  const {isDebug} = testRunnerOptions;
  const tmpDir = `${LH_ROOT}/.tmp/smokehouse`;
  await fs.mkdir(tmpDir, {recursive: true});
  const tmpPath = await fs.mkdtemp(`${tmpDir}/smokehouse-`);
  return internalRun(url, tmpPath, config, logger, testRunnerOptions)
    // Wait for internalRun() before removing scratch directory.
    .finally(() => !isDebug && fs.rm(tmpPath, {recursive: true, force: true}));
}

/**
 * Internal runner.
 * @param {string} url
 * @param {string} tmpPath
 * @param {LH.Config=} config
 * @param {LocalConsole=} logger
 * @param {Smokehouse.SmokehouseOptions['testRunnerOptions']=} options
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts}>}
 */
async function internalRun(url, tmpPath, config, logger, options) {
  const {isDebug, headless} = options || {};
  logger = logger || new LocalConsole();

  const outputPath = `${tmpPath}/smokehouse.report.json`;
  const artifactsDirectory = `${tmpPath}/artifacts/`;

  const args = [
    `${LH_ROOT}/cli/index.js`,
    `${url}`,
    `--output-path=${outputPath}`,
    '--output=json',
    `-G=${artifactsDirectory}`,
    `-A=${artifactsDirectory}`,
    '--port=0',
    '--quiet',
  ];

  if (headless) args.push('--chrome-flags="--headless=new"');

  // Config can be optionally provided.
  if (config) {
    const configPath = `${tmpPath}/config.json`;
    await fs.writeFile(configPath, JSON.stringify(config));
    args.push(`--config-path=${configPath}`);
  }

  const command = 'node';
  const env = {...process.env, NODE_ENV: 'test'};
  logger.log(`${log.dim}$ ${command} ${args.join(' ')} ${log.reset}`);

  /** @type {{stdout: string, stderr: string, code?: number}} */
  let execResult;
  try {
    execResult = await execFileAsync(command, args, {env});
  } catch (e) {
    // exec-thrown errors have stdout, stderr, and exit code from child process.
    execResult = e;
  }

  const exitCode = execResult.code || 0;
  if (isDebug) {
    logger.log(`exit code ${exitCode}`);
    logger.log(`STDOUT: ${execResult.stdout}`);
    logger.log(`STDERR: ${execResult.stderr}`);
  }

  try {
    await fs.access(outputPath);
  } catch (e) {
    throw new ChildProcessError(`Lighthouse run failed to produce a report and exited with ${exitCode}.`, // eslint-disable-line max-len
      logger.getLog());
  }

  /** @type {LH.Result} */
  const lhr = JSON.parse(await fs.readFile(outputPath, 'utf8'));
  const artifacts = assetSaver.loadArtifacts(artifactsDirectory);

  // Output has been established as existing, so can log for debug.
  if (isDebug) {
    logger.log(`LHR output available at: ${outputPath}`);
    logger.log(`Artifacts avaiable in: ${artifactsDirectory}`);
  }

  // There should either be both an error exitCode and a lhr.runtimeError or neither.
  if (Boolean(exitCode) !== Boolean(lhr.runtimeError)) {
    const runtimeErrorCode = lhr.runtimeError?.code;
    throw new ChildProcessError(`Lighthouse did not exit with an error correctly, exiting with ${exitCode} but with runtimeError '${runtimeErrorCode}'`, // eslint-disable-line max-len
      logger.getLog());
  }

  return {
    lhr,
    artifacts,
  };
}

export {
  runLighthouse,
};
