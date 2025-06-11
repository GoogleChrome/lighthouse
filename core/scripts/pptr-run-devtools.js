/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * USAGE:
 * Make sure CHROME_PATH is set to a modern version of Chrome.
 * May work on older versions of Chrome.
 *
 * To use with locally built DevTools and Lighthouse, run (assuming devtools at ~/src/devtools/devtools-frontend):
 *    DEVTOOLS_PATH=~/src/devtools/devtools-frontend sh core/scripts/build-devtools.sh
 *    yarn run-devtools --chrome-flags=--custom-devtools-frontend=file://$HOME/src/devtools/devtools-frontend/out/LighthouseIntegration/gen/front_end
 *
 * Or with the DevTools in .tmp:
 *   bash core/test/devtools-tests/setup.sh
 *   yarn run-devtools --chrome-flags=--custom-devtools-frontend=file://$PWD/.tmp/chromium-web-tests/devtools/devtools-frontend/out/LighthouseIntegration/gen/front_end
 *
 * URL list file: yarn run-devtools < path/to/urls.txt
 * Single URL: yarn run-devtools "https://example.com"
 */

import fs from 'fs';
import readline from 'readline';
import {fileURLToPath} from 'url';

import * as puppeteer from 'puppeteer-core';
import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';
import {launch} from 'chrome-launcher';
import esMain from 'es-main';

import {parseChromeFlags} from '../../cli/run.js';

const y = yargs(yargsHelpers.hideBin(process.argv));
const argv_ = y
  .usage('$0 [url]')
  .help('help').alias('help', 'h')
  .option('_', {type: 'string'})
  .option('output-dir', {
    type: 'string',
    default: 'latest-run/devtools-lhrs',
    alias: 'o',
  })
  .option('chrome-flags', {
    type: 'string',
    default: '',
  })
  .option('config', {
    type: 'string',
    alias: 'c',
  })
  .argv;

const argv = /** @type {Awaited<typeof argv_>} */ (argv_);

/**
 * Ideally we would use `page.evaluate` instead of this,
 * but we can't get a Puppeteer page object for the DevTools frontend.
 * This is a light re-implementation of `page.evaluate`.
 *
 * @template R [unknown]
 * @param {puppeteer.CDPSession} session
 * @param {string|(() => (R|Promise<R>))} fn
 * @param {Function[]} [deps]
 * @return {Promise<R>}
 */
async function evaluateInSession(session, fn, deps) {
  const depsSerialized = deps ? deps.join('\n') : '';

  const expression = typeof fn === 'string' ?
    fn :
    `(() => {
      ${depsSerialized}
      return (${fn.toString()})();
    })()`;
  const {result, exceptionDetails} = await session.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression,
  });

  if (exceptionDetails) {
    const text = exceptionDetails.exception?.description || exceptionDetails.text;
    const name = typeof fn === 'string' ? '<stringified>' : fn.name;
    throw new Error(`Evaluation exception: ${text}\n    at ${name} (Runtime.evaluate)`);
  }

  return result.value;
}

/**
 * Similar to {@link evaluateInSession}, this is a light re-implementation of Puppeteer's `page.waitForFunction`.
 *
 * @template R [unknown]
 * @param {puppeteer.CDPSession} session
 * @param {() => (R|Promise<R>)} fn
 * @param {Function[]} [deps]
 * @return {Promise<R>}
 */
async function waitForFunction(session, fn, deps) {
  let iterations = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await evaluateInSession(session, fn, deps);
    } catch (err) {
      // Random transient errors are common when first booting up.
      // Only surface errors if this fails 10 times in a row (~5s)
      if (iterations > 10) {
        console.error(`Error waiting for function (#${iterations}):`);
        console.error(err);
        console.error('Retrying...');
      }
      await new Promise(r => setTimeout(r, 500));
    } finally {
      ++iterations;
    }
  }
}

/* eslint-disable */
/**
 * https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/test_runner/TestRunner.js;l=170;drc=f59e6de269f4f50bca824f8ca678d5906c7d3dc8
 * @param {Record<string, function>} receiver
 * @param {string} methodName
 * @param {function} override
 */
function addSniffer(receiver, methodName, override) {
  const original = receiver[methodName];
  if (typeof original !== 'function') {
    throw new Error('Cannot find method to override: ' + methodName);
  }

  /**
   * @param  {...any} args
   */
  receiver[methodName] = function(...args) {
    let result;
    try {
      result = original.apply(this, args);
    } finally {
      receiver[methodName] = original;
    }
    // In case of exception the override won't be called.
    try {
      Array.prototype.push.call(args, result);
      override.apply(this, args);
    } catch (e) {
      throw new Error('Exception in overridden method \'' + methodName + '\': ' + e);
    }
    return result;
  };
}

async function waitForLighthouseReady() {
  // @ts-expect-error import
  const {ViewManager, DockController} = await import('./ui/legacy/legacy.js');
  // @ts-expect-error import
  const {LighthousePanel} = await import('./panels/lighthouse/lighthouse.js');
  // @ts-expect-error import
  const {TargetManager} = await import('./core/sdk/sdk.js');
  // @ts-expect-error import
  const {AdvancedApp} = await import('./panels/emulation/emulation.js');

  // Undocking later in the function can cause hiccups when Lighthouse enables device emulation.
  DockController.DockController.instance().setDockSide('undocked');

  await ViewManager.ViewManager.instance().showView('lighthouse');

  const panel = LighthousePanel.LighthousePanel.instance();

  const button = panel.contentElement.querySelector('.vbox.flex-auto').shadowRoot.querySelector('devtools-button,button');
  if (button.disabled) throw new Error('Start button disabled');

  const targetManager = TargetManager.TargetManager.instance();
  if (targetManager.primaryPageTarget() === null) {
    if (targetManager?.observeTargets) {
      await new Promise(resolve => targetManager.observeTargets({
        targetAdded: resolve,
        targetRemoved: () => {},
      }));
    } else {
      while (targetManager.primaryPageTarget() === null) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Ensure the emulation model is ready before Lighthouse starts by enabling device emulation.
  const {deviceModeView} = AdvancedApp.AdvancedApp.instance();
  if (!deviceModeView.isDeviceModeOn()) {
    deviceModeView.toggleDeviceMode();
  }
}

async function runLighthouse() {
  // @ts-expect-error import
  const {LighthousePanel} = await import('./panels/lighthouse/lighthouse.js');
  const panel = LighthousePanel.LighthousePanel.instance();

  /** @type {Promise<{lhr: LH.Result, artifacts: LH.Artifacts}>} */
  const resultPromise = new Promise((resolve, reject) => {
    const methodName = panel.__proto__.buildReportUI ? 'buildReportUI' : '_buildReportUI';
    addSniffer(
      panel.__proto__,
      methodName,
      /**
       * @param {LH.Result} lhr
       * @param {LH.Artifacts} artifacts
       */
      (lhr, artifacts) => resolve({lhr, artifacts})
    );

    addSniffer(
      panel.statusView.__proto__,
      'renderBugReport',
      reject,
    );
  });

  // In CI clicking the start button just once is flaky and can cause a timeout.
  // Therefore, keep clicking the button until we detect that the run started.
  const intervalHandle = setInterval(() => {
    const button = panel.contentElement.querySelector('.vbox.flex-auto').shadowRoot.querySelector('devtools-button,button');
    button.click();
  }, 100);

  addSniffer(
    panel.__proto__,
    'handleCompleteRun',
    () => clearInterval(intervalHandle),
  );

  return resultPromise;
}

async function enableDevToolsThrottling() {
  // @ts-expect-error import
  const {LighthousePanel} = await import('./panels/lighthouse/lighthouse.js');
  const panel = LighthousePanel.LighthousePanel.instance();

  const toolbarRoot = panel.contentElement.querySelector('.lighthouse-settings-pane devtools-toolbar');
  toolbarRoot.querySelector('option[value="devtools"]').selected = true;
  toolbarRoot.querySelector('select').dispatchEvent(new Event('change'));
}
/* eslint-enable */

/**
 * @param {puppeteer.CDPSession} inspectorSession
 * @param {LH.Config} config
 */
async function installCustomLighthouseConfig(inspectorSession, config) {
  // Prevent modification for tests that are retried.
  config = JSON.parse(JSON.stringify(config));

  // Screen emulation is handled by DevTools, so we should avoid adding our own.
  if (config.settings?.screenEmulation) {
    throw new Error(
      'Configs that modify device emulation are unsupported in DevTools:\n' +
      JSON.stringify(config, null, 2)
    );
  }
  if (!config.settings) config.settings = {};
  config.settings.screenEmulation = {disabled: true};

  // The throttling flag set via the Lighthouse panel will override whatever value is in the config.
  if (config.settings?.throttlingMethod === 'devtools') {
    await evaluateInSession(inspectorSession, enableDevToolsThrottling);
  }

  await evaluateInSession(
    inspectorSession,
    `UI.panels.lighthouse.controller.protocolService.configForTesting = ${JSON.stringify(config)}`
  );
}

/**
 * @param {puppeteer.CDPSession} inspectorSession
 * @param {string[]} logs
 */
async function installConsoleListener(inspectorSession, logs) {
  inspectorSession.on('Log.entryAdded', ({entry}) => {
    if (entry.level === 'verbose') return;
    logs.push(`LOG[${entry.level}]: ${entry.text}\n`);
  });
  inspectorSession.on('Runtime.exceptionThrown', ({exceptionDetails}) => {
    const text = exceptionDetails.exception?.description || exceptionDetails.text;
    logs.push(`EXCEPTION: ${text}\n`);
  });
  await inspectorSession.send('Log.enable');
}

/**
 * @param {puppeteer.Dialog} dialog
 */
function dismissDialog(dialog) {
  dialog.dismiss();
}

/**
 * @param {string} url
 * @param {{config?: LH.Config, chromeFlags?: string[]}} [options]
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts, logs: string[]}>}
 */
async function testUrlFromDevtools(url, options = {}) {
  const {config, chromeFlags = []} = options;

  const newChromeFlags = [
    ...chromeFlags,
    '--auto-open-devtools-for-tabs',
  ];

  const chrome = await launch({chromeFlags: newChromeFlags});

  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${chrome.port}`,
    defaultViewport: null,
    protocolTimeout: 300_000, // 5 min
  });

  /** @type {puppeteer.CDPSession|undefined} */
  let inspectorSession;

  try {
    if ((await browser.version()).startsWith('Headless')) {
      throw new Error('You cannot use headless');
    }

    const page = (await browser.pages())[0];

    const inspectorTarget = await browser.waitForTarget(t => t.url().includes('devtools'));
    inspectorSession = await inspectorTarget.createCDPSession();

    /** @type {string[]} */
    const logs = [];
    await installConsoleListener(inspectorSession, logs);

    page.on('dialog', dismissDialog);

    await page.goto(url, {waitUntil: ['domcontentloaded']});

    await waitForFunction(inspectorSession, waitForLighthouseReady);

    page.off('dialog', dismissDialog);

    if (config) {
      await installCustomLighthouseConfig(inspectorSession, config);
    }

    const result = await evaluateInSession(inspectorSession, runLighthouse, [addSniffer]);

    return {...result, logs};
  } catch (err) {
    if (inspectorSession) {
      const {data} = await inspectorSession.send('Page.captureScreenshot', {format: 'webp'});
      const image = `data:image/webp;base64,${data}`;
      throw new Error(
        `Lighthouse in DevTool failed. DevTools screenshot:\n${image}`,
        {cause: err}
      );
    }
    throw err;
  } finally {
    await browser.close();
  }
}

/**
 * @return {Promise<string[]>}
 */
async function readUrlList() {
  if (argv._[0]) return [argv._[0]];

  /** @type {string[]} */
  const urlList = [];
  const rl = readline.createInterface(process.stdin, process.stdout);

  rl.on('line', async line => {
    if (line.startsWith('#')) return;
    urlList.push(line);
  });

  return new Promise(resolve => rl.on('close', () => resolve(urlList)));
}

async function main() {
  const chromeFlags = parseChromeFlags(argv['chromeFlags']);
  const outputDir = argv['output-dir'];
  /** @type {LH.Config=} */
  const config = argv.config ? JSON.parse(argv.config) : undefined;

  // Create output directory.
  if (fs.existsSync(outputDir)) {
    if (fs.readdirSync(outputDir).length) {
      // eslint-disable-next-line no-console
      console.warn('WARNING: Output directory is not empty.');
    }
  } else {
    fs.mkdirSync(outputDir);
  }

  const customDevtools = chromeFlags
    .find(f => f.startsWith('--custom-devtools-frontend='))
    ?.replace('--custom-devtools-frontend=', '');
  if (customDevtools) {
    console.log(`Using custom devtools frontend: ${customDevtools}`);
    console.log('Make sure it has been built recently!');
    if (!customDevtools.startsWith('file://')) {
      throw new Error('custom-devtools-frontend must be a file:// URL');
    }
    if (!fs.existsSync(fileURLToPath(customDevtools))) {
      throw new Error('custom-devtools-frontend does not exist');
    }
  }

  let errorCount = 0;
  const urlList = await readUrlList();
  for (let i = 0; i < urlList.length; ++i) {
    try {
      /** @type {NodeJS.Timeout} */
      let timeout;
      const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(reject, 100_000, new Error('Timed out waiting for Lighthouse to run'));
      });
      const {lhr, artifacts} = await Promise.race([
        testUrlFromDevtools(urlList[i], {config, chromeFlags}),
        timeoutPromise,
      ]).finally(() => {
        clearTimeout(timeout);
      });

      fs.writeFileSync(`${argv.o}/lhr-${i}.json`, JSON.stringify(lhr, null, 2));
      fs.writeFileSync(`${argv.o}/artifacts-${i}.json`, JSON.stringify(artifacts, null, 2));
    } catch (error) {
      errorCount += 1;
      console.error(error.message);
      fs.writeFileSync(`${argv.o}/lhr-${i}.json`, JSON.stringify({error: error.message}, null, 2));
    }
  }
  console.log(`${urlList.length - errorCount} / ${urlList.length} urls run successfully.`);
  console.log(`Results saved to ${argv.o}`);

  if (errorCount) process.exit(1);
}

if (esMain(import.meta)) {
  await main();
}

export {testUrlFromDevtools};
