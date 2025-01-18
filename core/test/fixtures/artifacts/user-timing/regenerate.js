/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {startFlow} from '../../../../index.js';
import {updateTestFixture} from '../update-test-fixture.js';

/**
 * @param {import('puppeteer').Page} page
 * @param {number} port
 */
async function runUserFlow(page, port) {
  const flow = await startFlow(page);

  await flow.startTimespan();
  await page.goto(`http://localhost:${port}/user-timing.html`, {waitUntil: 'networkidle0'});
  await page.click('#button');
  await page.waitForFunction('results.textContent');
  await flow.endTimespan();

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const {traceEvents} = artifacts.Trace;

  [
    'start',
    'fetch-end',
    'fetch-end',
    'Zone:ZonePromise',
  ].forEach(eventName => {
    if (!traceEvents.find(e => e.cat === 'blink.user_timing' && e.name === eventName)) {
      throw new Error(`missing user timing: ${eventName}`);
    }
  });
}

await updateTestFixture({
  name: 'user-timing',
  about: 'Page with calls to the performance user timings API',
  saveTrace: true,
  saveDevtoolsLog: false,
  runUserFlow,
  verify,
});
