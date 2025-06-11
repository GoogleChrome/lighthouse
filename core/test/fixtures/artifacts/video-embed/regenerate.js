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

  await flow.navigate(`http://localhost:${port}/video-embed.html`);

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const {traceEvents} = artifacts.Trace;

  if (!traceEvents.find(e =>
    e.name === 'navigationStart' && e.args.data?.documentLoaderURL?.includes('youtube.com'))) {
    throw new Error('missing video embed');
  }
  if (!traceEvents.find(e =>
    e.name === 'navigationStart' && e.args.data?.documentLoaderURL?.includes('vimeo.com'))) {
    throw new Error('missing video embed');
  }
}

await updateTestFixture({
  name: 'video-embed',
  about: 'Page with a YouTube and Vimeo video',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
