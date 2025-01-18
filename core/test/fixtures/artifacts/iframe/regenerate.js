/**
 * @license
 * Copyright 2024 Google LLC
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
      throttlingMethod: 'provided',
    },
  });

  await flow.navigate(`http://localhost:${port}/perf/frame-metrics.html`);

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const {traceEvents} = artifacts.Trace;

  if (!traceEvents.find(e =>
    e.name === 'LayoutInvalidationTracking' && e.args.data.nodeName.startsWith('IFRAME '))) {
    throw new Error('no layout invalidation found inside iframe');
  }
}

await updateTestFixture({
  name: 'iframe',
  about: 'Page with an iframe performing a lot of layout',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
