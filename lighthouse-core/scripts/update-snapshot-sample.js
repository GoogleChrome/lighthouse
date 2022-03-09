/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import fs from 'fs';

import puppeteer from 'puppeteer';

import {LH_ROOT} from '../../root.js';
import {snapshot} from '../fraggle-rock/api.js';

(async () => {
  const browser = await puppeteer.launch({
    ignoreDefaultArgs: ['--enable-automation'],
    executablePath: process.env.CHROME_PATH,
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto('https://example.com/');

  const result = await snapshot({page});
  if (!result || typeof result.report !== 'string') {
    throw new Error('LHR string not found');
  }

  fs.writeFileSync(
    `${LH_ROOT}/lighthouse-core/test/fixtures/fraggle-rock/reports/sample-snapshot-lhr.json`,
    result.report
  );

  await browser.close();
})();
