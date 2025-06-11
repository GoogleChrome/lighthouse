/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {startFlow} from '../../../../index.js';
import {updateTestFixture} from '../update-test-fixture.js';

/**
 * @param {import('puppeteer').Page} page
 */
async function runUserFlow(page) {
  const flow = await startFlow(page, {
    flags: {
      throttlingMethod: 'provided',
    },
  });

  await flow.navigate('http://www.vkontakte.ru/');

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const {traceEvents} = artifacts.Trace;

  if (!traceEvents.find(e => e.name === 'redirectStart')) {
    throw new Error('missing redirectStart');
  }

  const redirects = artifacts.DevtoolsLog.filter(e => e.method === 'Network.requestWillBeSent' &&
    e.params.type === 'Document' && e.params.redirectResponse);
  if (redirects.length !== 3) {
    throw new Error('expected 3 server initiated redirects');
  }

  if (!artifacts.DevtoolsLog.find(
    e =>e.method === 'Page.frameScheduledNavigation' && e.params.reason === 'reload')) {
    throw new Error('missing reload');
  }
}

await updateTestFixture({
  name: 'redirect',
  about: 'Page with a multiple navigation-initiated redirects and a JS reload',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
