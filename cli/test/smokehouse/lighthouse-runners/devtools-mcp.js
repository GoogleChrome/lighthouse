/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A runner that launches Chrome and executes Lighthouse via the
 * DevTools MCP bundle.
 */

import fs from 'fs';
import os from 'os';
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import {once} from 'events';

import puppeteer from 'puppeteer-core';
import * as ChromeLauncher from 'chrome-launcher';

import {LH_ROOT} from '../../../../shared/root.js';
import {loadArtifacts, saveArtifacts} from '../../../../core/lib/asset-saver.js';
import {LocalConsole} from '../lib/local-console.js';

// This runs only in the worker. The rest runs on the main thread.
if (!isMainThread && parentPort) {
  (async () => {
    const {url, config, testRunnerOptions} = workerData;
    try {
      const result = await runBundledLighthouse(url, config, testRunnerOptions);
      // Save to assets directory because LighthouseError won't survive postMessage.
      const assetsDir = fs.mkdtempSync(os.tmpdir() + '/smoke-mcp-assets-');
      await saveArtifacts(result.artifacts, assetsDir);
      const value = {
        lhr: result.lhr,
        assetsDir,
      };
      parentPort?.postMessage({type: 'result', value});
    } catch (err) {
      console.error(err);
      parentPort?.postMessage({type: 'error', value: err.toString()});
    }
  })();
}

/**
 * @param {string} url
 * @param {LH.Config|undefined} config
 * @param {Smokehouse.SmokehouseOptions['testRunnerOptions']} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts}>}
 */
async function runBundledLighthouse(url, config, testRunnerOptions) {
  if (isMainThread || !parentPort) {
    throw new Error('must be called in worker');
  }

  // Load bundle.
  const {navigation} = await import(LH_ROOT + '/dist/lighthouse-devtools-mcp-bundle.js');

  // Launch and connect to Chrome.
  const launchedChrome = await ChromeLauncher.launch({
    chromeFlags: [
      testRunnerOptions?.headless ? '--headless=new' : '',
    ],
  });
  const port = launchedChrome.port;

  // Run Lighthouse.
  try {
    const logLevel = testRunnerOptions?.isDebug ? 'verbose' : 'info';

    // Puppeteer is not included in the bundle, we must create the page here.
    const browser = await puppeteer.connect({browserURL: `http://127.0.0.1:${port}`});
    const page = await browser.newPage();

    // navigation(page, requestor, options)
    const runnerResult = await navigation(page, url, {config, flags: {port, logLevel}});

    if (!runnerResult) throw new Error('No runnerResult');

    return {
      lhr: runnerResult.lhr,
      artifacts: runnerResult.artifacts,
    };
  } finally {
    // Clean up and return results.
    launchedChrome.kill();
  }
}

/**
 * Launch Chrome and do a full Lighthouse run via the Lighthouse DevTools MCP bundle.
 * @param {string} url
 * @param {LH.Config=} config
 * @param {LocalConsole=} logger
 * @param {Smokehouse.SmokehouseOptions['testRunnerOptions']=} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts}>}
 */
async function runLighthouse(url, config, logger, testRunnerOptions = {}) {
  logger = logger || new LocalConsole();

  const worker = new Worker(new URL(import.meta.url), {
    stdout: true,
    stderr: true,
    workerData: {url, config, testRunnerOptions},
  });
  worker.stdout.setEncoding('utf8');
  worker.stderr.setEncoding('utf8');
  worker.stdout.addListener('data', (data) => {
    logger.log(`[STDOUT] ${data}`);
  });
  worker.stderr.addListener('data', (data) => {
    logger.log(`[STDERR] ${data}`);
  });
  const [workerResponse] = await once(worker, 'message');

  if (workerResponse.type === 'error') {
    const log = logger.getLog();
    throw new Error(`Worker returned an error: ${workerResponse.value}
Log:
${log}
`);
  }

  const result = workerResponse.value;
  if (!result.lhr || !result.assetsDir) {
    throw new Error(`invalid response from worker:
${JSON.stringify(result, null, 2)}`);
  }

  const artifacts = loadArtifacts(result.assetsDir);
  fs.rmSync(result.assetsDir, {recursive: true});

  return {
    lhr: result.lhr,
    artifacts,
  };
}

export {
  runLighthouse,
};
