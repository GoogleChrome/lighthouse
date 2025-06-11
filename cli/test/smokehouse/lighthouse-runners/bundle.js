/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview  A runner that launches Chrome and executes Lighthouse via a
 * bundle to test that bundling has produced correct and runnable code.
 * Currently uses `lighthouse-dt-bundle.js`.
 * Runs in a worker to avoid messing up marky's global state.
 */

import fs from 'fs';
import os from 'os';
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import {once} from 'events';

import puppeteer from 'puppeteer-core';
import * as ChromeLauncher from 'chrome-launcher';
import thirdPartyWebLib from 'third-party-web/nostats-subset.js';

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
      const assetsDir = fs.mkdtempSync(os.tmpdir() + '/smoke-bundle-assets-');
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

  const originalBuffer = global.Buffer;
  const originalRequire = global.require;
  const originalProcess = global.process;
  if (typeof globalThis === 'undefined') {
    // @ts-expect-error - exposing for loading of dt-bundle.
    global.globalThis = global;
  }

  // Load bundle, which creates a `global.runBundledLighthouse`.
  await import(LH_ROOT + '/dist/lighthouse-dt-bundle.js');

  global.require = originalRequire;
  global.Buffer = originalBuffer;
  global.process = originalProcess;

  /** @type {import('../../../../core/index.js')['default']} */
  // @ts-expect-error - not worth giving test global an actual type.
  const lighthouse = global.runBundledLighthouse;

  /** @type {import('../../../../core/lib/third-party-web.js')['default']} */
  // @ts-expect-error
  const thirdPartyWeb = global.thirdPartyWeb;
  thirdPartyWeb.provideThirdPartyWeb(thirdPartyWebLib);

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
    const runnerResult = await lighthouse(url, {port, logLevel}, config, page);
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
 * Launch Chrome and do a full Lighthouse run via the Lighthouse DevTools bundle.
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
    throw new Error(`Worker returned an error: ${workerResponse.value}\nLog:\n${log}\n`);
  }

  const result = workerResponse.value;
  if (!result.lhr || !result.assetsDir) {
    throw new Error(`invalid response from worker:\n${JSON.stringify(result, null, 2)}`);
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
