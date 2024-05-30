/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// https://docs.google.com/spreadsheets/d/1AaYzpzWnpXQ4JB5IZzOkTO9Zf5Sm0I8dsp7MhBgthMg/edit?usp=sharing

import fs from 'fs';

import * as puppeteer from 'puppeteer';
import {getChromePath} from 'chrome-launcher';

import {LH_ROOT} from '../../../../shared/root.js';
import {Server} from '../../../../cli/test/fixtures/static-server.js';
import {saveTrace, saveDevtoolsLog, saveArtifacts} from '../../../lib/asset-saver.js';

/**
 * @typedef CollectMeta
 * @property {string} name
 * @property {string} about
 * @property {(page: puppeteer.Page, port: number) => Promise<LH.UserFlow>} runUserFlow
 * @property {(artifacts: LH.Artifacts) => void} verify
 * @property {boolean} saveTrace
 * @property {boolean} saveDevtoolsLog
 * @property {boolean} saveArtifacts
 */

/**
 * @param {CollectMeta} collectMeta
*/
export async function updateTestFixture(collectMeta) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: getChromePath(),
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const server = new Server(0);
  const dir = `${LH_ROOT}/core/test/fixtures/artifacts/${collectMeta.name}`;
  if (fs.existsSync(`${dir}/page`)) {
    server.baseDir = `${dir}/page`;
  }
  await server.listen(0, 'localhost');
  const port = server.getPort();

  try {
    const page = await browser.newPage();
    const flow = await collectMeta.runUserFlow(page, port);
    const {artifacts} = flow.createArtifactsJson().gatherSteps[0];
    const result = await flow.createFlowResult();
    collectMeta.verify(artifacts, result);
    if (collectMeta.saveArtifacts) {
      await saveArtifacts(artifacts, dir, {gzip: true});
    } else {
      if (collectMeta.saveTrace) {
        await saveTrace(artifacts.Trace, `${dir}/trace.json`, {gzip: true});
      }
      if (collectMeta.saveDevtoolsLog) {
        await saveDevtoolsLog(artifacts.DevtoolsLog, `${dir}/devtoolslog.json`, {gzip: true});
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
}
