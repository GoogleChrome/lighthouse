/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A runner that launches Chrome and executes Lighthouse via DevTools.
 */

import {execFileSync} from 'child_process';

import {LH_ROOT} from '../../../../shared/root.js';
import {testUrlFromDevtools} from '../../../../core/scripts/pptr-run-devtools.js';

const devtoolsDir =
  process.env.DEVTOOLS_PATH || `${LH_ROOT}/.tmp/chromium-web-tests/devtools/devtools-frontend`;

/**
 * Download/pull latest DevTools, build Lighthouse for DevTools, roll to DevTools, and build DevTools.
 */
async function setup() {
  if (process.env.CI) return;

  process.env.DEVTOOLS_PATH = devtoolsDir;
  execFileSync('bash',
    ['core/test/devtools-tests/download-devtools.sh'],
    {stdio: 'inherit'}
  );
  execFileSync('bash',
    ['core/test/devtools-tests/roll-devtools.sh'],
    {stdio: 'inherit'}
  );
}

/**
 * Launch Chrome and do a full Lighthouse run via DevTools.
 * By default, the latest DevTools frontend is used (.tmp/chromium-web-tests/devtools/devtools-frontend)
 * unless DEVTOOLS_PATH is set.
 * CHROME_PATH determines which Chrome is used–otherwise the default is puppeteer's chrome binary.
 * @param {string} url
 * @param {LH.Config=} config
 * @param {import('../lib/local-console.js').LocalConsole=} logger
 * @param {Smokehouse.SmokehouseOptions['testRunnerOptions']=} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts}>}
 */
async function runLighthouse(url, config, logger, testRunnerOptions) {
  const chromeFlags = [
    testRunnerOptions?.headless ? '--headless=new' : '',
    `--custom-devtools-frontend=file://${devtoolsDir}/out/LighthouseIntegration/gen/front_end`,
  ];
  // TODO: `testUrlFromDevtools` should accept a logger, so we get some output even for time outs.
  const {lhr, artifacts, logs} = await testUrlFromDevtools(url, {
    config,
    chromeFlags,
  });
  if (logger) {
    logger.log(logs.join('') + '\n');
  }
  return {lhr, artifacts};
}

export {
  runLighthouse,
  setup,
};
