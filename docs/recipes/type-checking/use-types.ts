/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {writeFileSync} from 'fs';

import * as lhApi from 'lighthouse';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const config: lhApi.Config = {
  extends: 'lighthouse:default',
  settings: {
    skipAudits: ['uses-http2'],
  },
};

// Lighthouse will accept a page from whatever Puppeteer version is installed.
const flow: lhApi.UserFlow = await lhApi.startFlow(page, {config});

await flow.navigate('https://example.com');

await flow.startTimespan({name: 'Click button'});
await page.click('button');
await flow.endTimespan();

await flow.snapshot({name: 'New page state'});

const report = await flow.generateReport();
writeFileSync('flow.report.html', report);
