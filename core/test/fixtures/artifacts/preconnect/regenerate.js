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
  const flow = await startFlow(page, {
    flags: {
      networkQuietThresholdMs: 15000,
    },
  });

  await flow.navigate(`http://localhost:${port}/preconnect.html`);

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const originWithPreconnect = 'https://fonts.gstatic.com';

  const responseReceived = artifacts.DevtoolsLog.find(e =>
    e.method === 'Network.responseReceived' &&
    e.params.response.url.startsWith(originWithPreconnect));
  if (!responseReceived) throw new Error(`missing response for ${originWithPreconnect}`);

  console.log(responseReceived.params.response.timing);
  // Connection should have already been established, either b/c of the preconnect or the iframe.
  // TODO: why is this not working as expected?
  if (responseReceived.params.response.timing.connectStart !== -1) {
    throw new Error('expected connectStart to be -1');
  }
}

await updateTestFixture({
  name: 'preconnect',
  about: 'Page with a preconnect to another origin',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
