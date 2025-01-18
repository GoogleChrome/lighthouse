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

  await flow.navigate(`http://localhost:${port}/animation.html`);

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const {traceEvents} = artifacts.Trace;

  const failingAnimationEvents =
    traceEvents.filter(e => e.name === 'Animation' && e.args.data?.compositeFailed);
  if (failingAnimationEvents.length !== 3) {
    throw new Error('expected 3 Animation events to fail compositing');
  }
}

await updateTestFixture({
  name: 'animation',
  about: 'Page with an animated elements that are composited and non-composited',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
