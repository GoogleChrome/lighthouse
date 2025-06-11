/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global globalThis */

import {Buffer} from 'buffer';

import log from 'lighthouse-logger';
import {CdpBrowser} from 'puppeteer-core/lib/esm/puppeteer/cdp/Browser.js';
import {Connection as PptrConnection} from 'puppeteer-core/lib/esm/puppeteer/cdp/Connection.js';

import lighthouse, * as api from '../../core/index.js';
import {LighthouseError} from '../../core/lib/lh-error.js';
import {processForProto} from '../../core/lib/proto-preprocessor.js';
import * as assetSaver from '../../core/lib/asset-saver.js';
import mobileConfig from '../../core/config/lr-mobile-config.js';
import desktopConfig from '../../core/config/lr-desktop-config.js';
import {pageFunctions} from '../../core/lib/page-functions.js';

/** @type {Record<'mobile'|'desktop', LH.Config>} */
const LR_PRESETS = {
  mobile: mobileConfig,
  desktop: desktopConfig,
};

// Rollup seems to overlook some references to `Buffer`, so it must be made explicit.
// (`parseSourceMapFromDataUrl` breaks without this)
/** @type {BufferConstructor} */
globalThis.Buffer = Buffer;

/**
 * @param {any} connection
 * @return {Promise<LH.Puppeteer.Page>}
 */
async function getPageFromConnection(connection) {
  await connection.connect();
  const {targetInfo: mainTargetInfo} =
    await connection.sendCommand('Target.getTargetInfo', undefined);
  const {frameTree} = await connection.sendCommand('Page.getFrameTree', undefined);

  const channel = connection.channel_ || connection.rootSessionConnection_;
  const transport = channel.root_.transport_;

  const pptrConnection = new PptrConnection(mainTargetInfo.url, transport);

  const browser = await CdpBrowser._create(
    pptrConnection,
    [] /* contextIds */,
    false /* ignoreHTTPSErrors */
  );

  // We should be able to find the relevant page instantly, but just in case
  // the relevant tab target comes a bit delayed, check every time a new
  // target is seen.
  const targetPromise = browser.waitForTarget(async (target) => {
    const page = await target.page();
    if (page && page.mainFrame()._id === frameTree.frame.id) return true;
    return false;
  });
  const page = await Promise.race([
    targetPromise.then(target => target.page()),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Could not find relevant puppeteer page')), 5000);
    }),
  ]);
  return page;
}

/**
 * Run lighthouse for connection and provide similar results as in CLI.
 *
 * If configOverride is provided, lrDevice and categoryIDs are ignored.
 * @param {any} connection
 * @param {string} url
 * @param {LH.Flags} flags Lighthouse flags
 * @param {{lrDevice?: 'desktop'|'mobile', categoryIDs?: Array<string>, logAssets: boolean, configOverride?: LH.Config, ignoreStatusCode?: boolean}} lrOpts Options coming from Lightrider
 * @return {Promise<string>}
 */
async function runLighthouseInLR(connection, url, flags, lrOpts) {
  const {lrDevice, categoryIDs, logAssets, configOverride, ignoreStatusCode} = lrOpts;

  // Certain fixes need to kick in under LR, see https://github.com/GoogleChrome/lighthouse/issues/5839
  global.isLightrider = true;

  // disableStorageReset because it causes render server hang
  flags.disableStorageReset = true;
  flags.logLevel = flags.logLevel || 'info';
  flags.channel = 'lr';

  let config;
  if (configOverride) {
    config = configOverride;
  } else {
    config = lrDevice === 'desktop' ? LR_PRESETS.desktop : LR_PRESETS.mobile;
    config.settings = config.settings || {};
    config.settings.ignoreStatusCode = ignoreStatusCode;
    if (categoryIDs) {
      config.settings.onlyCategories = categoryIDs;
    }
  }

  try {
    const page = await runLighthouseInLR.getPageFromConnection(connection);
    const runnerResult = await lighthouse(url, flags, config, page);

    if (!runnerResult) throw new Error('Lighthouse finished without a runnerResult');

    // pre process the LHR for proto
    const preprocessedLhr = processForProto(runnerResult.lhr);

    // When LR is called with |internal: {keep_raw_response: true, save_lighthouse_assets: true}|,
    // we log artifacts to raw_response.artifacts.
    if (logAssets) {
      // Properly serialize artifact errors.
      const artifactsJson = JSON.stringify(runnerResult.artifacts, assetSaver.stringifyReplacer);

      return JSON.stringify({
        ...preprocessedLhr,
        artifacts: JSON.parse(artifactsJson),
      });
    }

    return JSON.stringify(preprocessedLhr);
  } catch (err) {
    // If an error ruined the entire lighthouse run, attempt to return a meaningful error.
    let runtimeError;
    if (!(err instanceof LighthouseError) || !err.lhrRuntimeError) {
      runtimeError = {
        code: LighthouseError.UNKNOWN_ERROR,
        message: `Unknown error encountered with message '${err.message}'`,
      };
    } else {
      runtimeError = {
        code: err.code,
        message: err.friendlyMessage ?
            `${err.friendlyMessage} (${err.message})` :
            err.message,
      };
    }

    return JSON.stringify({runtimeError}, null, 2);
  }
}

/** @param {(status: [string, string, string]) => void} listenCallback */
function listenForStatus(listenCallback) {
  log.events.addListener('status', listenCallback);
  log.events.addListener('warning', listenCallback);
}

// Expose on window for browser-residing consumers of file.
if (typeof window !== 'undefined') {
  // @ts-expect-error - not worth typing a property on `window`.
  window.runLighthouseInLR = runLighthouseInLR;
  // @ts-expect-error
  self.listenForStatus = listenForStatus;
}

const {computeBenchmarkIndex} = pageFunctions;

runLighthouseInLR.getPageFromConnection = getPageFromConnection;

export {
  runLighthouseInLR,
  api,
  listenForStatus,
  LR_PRESETS,
  computeBenchmarkIndex,
};
