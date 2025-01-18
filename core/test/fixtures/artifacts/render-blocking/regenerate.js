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

  await flow.navigate(`http://localhost:${port}/render-blocking.html`);

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const {traceEvents} = artifacts.Trace;

  const requestEvents = traceEvents.filter(e => e.name === 'ResourceSendRequest');

  // 4 requests + favicon
  if (requestEvents.length !== 5) throw new Error('Wrong # of requests');

  const blockingEvents = requestEvents.filter(e => e.args.data.renderBlocking === 'blocking');
  if (blockingEvents.length !== 1) throw new Error('Wrong # of blocking requests');

  const parserBlockingEvents =
    requestEvents.filter(e => e.args.data.renderBlocking === 'in_body_parser_blocking');
  if (parserBlockingEvents.length !== 1) throw new Error('Wrong # of parser blocking requests');
}

await updateTestFixture({
  name: 'render-blocking',
  about: 'Page with render blocking resources',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
