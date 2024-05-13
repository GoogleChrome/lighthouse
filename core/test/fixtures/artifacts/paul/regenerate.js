/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {startFlow} from '../../../../index.js';
import {updateTestFixture} from '../update-test-fixture.js';

/**
 * @param {import('puppeteer').Page} page
 */
async function runUserFlow(page) {
  const flow = await startFlow(page);

  await flow.navigate('https://www.paulirish.com');

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const {traceEvents} = artifacts.Trace;

  if (!traceEvents.find(e => e.name === 'largestContentfulPaint::Candidate')) {
    throw new Error('missing largestContentfulPaint::Candidate');
  }
}

await updateTestFixture({
  name: 'paul',
  about: 'Paul\'s website. Can use for paint metrics. Not very heavy.',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
