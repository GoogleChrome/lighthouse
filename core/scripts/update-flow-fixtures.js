/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global document */

import fs from 'fs';
import assert from 'assert/strict';

import open from 'open';
import waitForExpect from 'wait-for-expect';
import * as puppeteer from 'puppeteer-core';
import yargs from 'yargs';
import {getChromePath} from 'chrome-launcher';
import log from 'lighthouse-logger';

import {LH_ROOT} from '../../shared/root.js';
import * as api from '../index.js';
import * as assetSaver from '../lib/asset-saver.js';

/* eslint-disable max-len */
const ARTIFACTS_PATH = `${LH_ROOT}/core/test/fixtures/user-flows/artifacts/`;
const FLOW_RESULT_PATH = `${LH_ROOT}/core/test/fixtures/user-flows/reports/sample-flow-result.json`;
const FLOW_REPORT_PATH = `${LH_ROOT}/dist/sample-reports/flow-report/index.html`;
/* eslint-enable max-len */

const args = yargs(process.argv.slice(2))
  .options({
    'view': {
      type: 'boolean',
      default: false,
    },
    'rebaseline-artifacts': {
      type: 'array',
      alias: 'a',
    },
    'output-path': {
      type: 'string',
      default: FLOW_RESULT_PATH,
    },
  })
  .parseSync();

/** @param {puppeteer.Page} page */
async function waitForImagesToLoad(page) {
  const TIMEOUT = 30_000;
  const QUIET_WINDOW = 3_000;

  /** @return {Promise<Array<{src: string, complete: boolean}>>} */
  async function getImageLoadingStates() {
    return page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .map(img => ({
          src: img.src,
          complete: img.complete,
        }))
    );
  }

  await waitForExpect(async () => {
    // First check all images that are in the page are complete.
    const firstRunImages = await getImageLoadingStates();
    const completeImages = firstRunImages.filter(image => image.complete);
    assert.deepStrictEqual(completeImages, firstRunImages);

    // Next check we haven't added any new images in the quiet window.
    await new Promise(r => setTimeout(r, QUIET_WINDOW));
    const secondRunImages = await getImageLoadingStates();
    assert.deepStrictEqual(secondRunImages, firstRunImages);
  }, TIMEOUT);
}

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    skipAudits: ['uses-http2'],
  },
};

/**
 * @param {(string|number)[]} artifactKeys
 */
async function rebaselineArtifacts(artifactKeys) {
  const browser = await puppeteer.launch({
    ignoreDefaultArgs: ['--enable-automation'],
    executablePath: getChromePath(),
    headless: false,
  });

  const page = await browser.newPage();
  const flow = await api.startFlow(page, {config});

  await flow.navigate('https://www.mikescerealshack.co');

  await flow.startTimespan({name: 'Search input'});
  await page.type('input', 'call of duty');
  const networkQuietPromise = page.waitForNavigation({waitUntil: ['networkidle0']});
  await page.click('button[type=submit]');
  await networkQuietPromise;
  await waitForImagesToLoad(page);
  await flow.endTimespan();

  await flow.snapshot({name: 'Search results'});

  await flow.navigate('https://www.mikescerealshack.co/corrections');

  await browser.close();

  let flowArtifacts = flow.createArtifactsJson();

  // Normalize some data so it doesn't change on every update.
  for (const {artifacts} of flowArtifacts.gatherSteps) {
    const timingCopy = JSON.parse(JSON.stringify(artifacts.Timing));
    assetSaver.normalizeTimingEntries(timingCopy);
    artifacts.Timing = timingCopy;
  }

  if (artifactKeys.length) {
    const newFlowArtifacts = flowArtifacts;
    flowArtifacts = assetSaver.loadFlowArtifacts(ARTIFACTS_PATH);
    for (let i = 0; i < flowArtifacts.gatherSteps.length; ++i) {
      const gatherStep = flowArtifacts.gatherSteps[i];
      const newGatherStep = newFlowArtifacts.gatherSteps[i];

      gatherStep.flags = newGatherStep.flags;
      for (const key of Object.keys(gatherStep)) {
        if (key in newGatherStep) continue;
        // @ts-expect-error
        delete gatherStep[key];
      }

      for (const key of artifactKeys) {
        // @ts-expect-error
        gatherStep.artifacts[key] = newGatherStep.artifacts[key];
      }
    }
  }

  await assetSaver.saveFlowArtifacts(flowArtifacts, ARTIFACTS_PATH);

  // Ensure the timing entries from saving the artifacts don't persist into the auditing phase.
  log.takeTimeEntries();
}

async function generateFlowResult() {
  const flowArtifacts = assetSaver.loadFlowArtifacts(ARTIFACTS_PATH);
  const flowResult = await api.auditFlowArtifacts(flowArtifacts, config);

  // Normalize some data so it doesn't change on every update.
  for (const {lhr} of flowResult.steps) {
    assetSaver.normalizeTimingEntries(lhr.timing.entries);
    assetSaver.elideAuditErrorStacks(lhr);
    lhr.timing.total = lhr.timing.entries.length;
  }

  fs.writeFileSync(args.outputPath, JSON.stringify(flowResult, null, 2));

  if (args.view) {
    const htmlReport = await api.generateReport(flowResult);
    fs.writeFileSync(FLOW_REPORT_PATH, htmlReport);
    open(FLOW_REPORT_PATH);
  }
}

if (args.rebaselineArtifacts) {
  await rebaselineArtifacts(args.rebaselineArtifacts);
}
await generateFlowResult();
