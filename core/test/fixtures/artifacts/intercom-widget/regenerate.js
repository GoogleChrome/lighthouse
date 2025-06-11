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
  const flow = await startFlow(page);

  await flow.navigate('https://www.intercom.com/help/en/articles/170-integrate-intercom-in-a-single-page-app');

  return flow;
}

/**
 * @param {LH.Artifacts} artifacts
 */
function verify(artifacts) {
  const devtoolsLog = artifacts.DevtoolsLog;

  const facadeResourceEvents = devtoolsLog.filter(e =>
    /widget\.intercom\.io/.test(e.params?.request?.url)
  );

  if (facadeResourceEvents.length === 0) {
    throw new Error('expected a resource matching URL pattern "widget.intercom.io"');
  }
}

await updateTestFixture({
  name: 'intercom-widget',
  about: 'Page with a Intercom widget that can be replaced with a facade',
  saveTrace: true,
  saveDevtoolsLog: true,
  runUserFlow,
  verify,
});
