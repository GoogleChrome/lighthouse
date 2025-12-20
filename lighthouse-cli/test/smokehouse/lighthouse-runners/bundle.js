/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview  A runner that launches Chrome and executes Lighthouse via a
 * bundle to test that bundling has produced correct and runnable code.
 * Currently uses `lighthouse-dt-bundle.js`.
 */

const ChromeLauncher = require('chrome-launcher');
const ChromeProtocol = require('../../../../lighthouse-core/gather/connections/cri.js');

// Load bundle, which creates a `global.runBundledLighthouse`.
require('../../../../dist/lighthouse-dt-bundle.js');

/** @type {import('../../../../lighthouse-core/index.js')} */
// @ts-ignore - not worth giving test global an actual type.
const lighthouse = global.runBundledLighthouse;

/**
 * Launch Chrome and do a full Lighthouse run via the Lighthouse CLI.
 * @param {string} url
 * @param {LH.Config.Json=} configJson
 * @param {{isDebug?: boolean}=} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts, log: string}>}
 */
async function runLighthouse(url, configJson, testRunnerOptions = {}) {
  // Launch and connect to Chrome.
  const launchedChrome = await ChromeLauncher.launch();
  const port = launchedChrome.port;
  const connection = new ChromeProtocol(port);

  // Run Lighthouse.
  const logLevel = testRunnerOptions.isDebug ? 'info' : undefined;
  const runnerResult = await lighthouse(url, {port, logLevel}, configJson, connection);
  if (!runnerResult) throw new Error('No runnerResult');

  // Clean up and return results.
  await launchedChrome.kill();
  return {
    lhr: runnerResult.lhr,
    artifacts: runnerResult.artifacts,
    log: '', // TODO: if want to run in parallel, need to capture lighthouse-logger output.
  };
}

module.exports = {
  runLighthouse,
};
