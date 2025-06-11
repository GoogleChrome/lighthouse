/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';

import {startFlow} from '../../../../index.js';
import {updateTestFixture} from '../update-test-fixture.js';

/**
 * @param {import('puppeteer').Page} page
 * @param {number} port
 */
async function runUserFlow(page, port) {
  const flow = await startFlow(page);

  await flow.navigate(`http://localhost:${port}/ric-shim.html?long`);

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.LH.FlowResult} result
 */
function verify(artifacts, result) {
  const {lhr} = result.steps[0];
  assert(lhr.audits['total-blocking-time'].numericValue >= 5000);
}

await updateTestFixture({
  name: 'blocking-time',
  about: 'A page with lots of activity on the main thread, long tasks from requestIdleCallback',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
