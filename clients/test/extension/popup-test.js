/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const path = require('path');
const puppeteer = require('../../../node_modules/puppeteer/index.js');
const {DEFAULT_CATEGORIES, STORAGE_KEYS} =
  require('../../extension/scripts/settings-controller.js');

const lighthouseExtensionPath = path.resolve(__dirname, '../../../dist/extension-chrome');

const mockStorage = {
  [STORAGE_KEYS.Categories]: {
    'performance': true,
    'pwa': true,
    'seo': true,
    'accessibility': false,
    'best-practices': false,
  },
  [STORAGE_KEYS.Settings]: {
    device: 'mobile',
  },
};

describe('Lighthouse chrome popup', function() {
  // eslint-disable-next-line no-console
  console.log('\n✨ Be sure to have recently run this: yarn build-extension');

  let browser;
  let page;
  const pageErrors = [];

  beforeAll(async function() {
    // start puppeteer
    browser = await puppeteer.launch({
      headless: false,
      executablePath: process.env.CHROME_PATH,
    });

    page = await browser.newPage();
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    await page.evaluateOnNewDocument((mockStorage) => {
      Object.defineProperty(chrome, 'tabs', {
        get: () => ({
          query: (args, cb) => {
            cb([{
              url: 'http://example.com',
            }]);
          },
        }),
      });
      Object.defineProperty(chrome, 'storage', {
        get: () => ({
          local: {
            get: (keys, cb) => cb(mockStorage),
          },
        }),
      });
      Object.defineProperty(chrome, 'runtime', {
        get: () => ({
          getManifest: () => ({}),
        }),
      });
      Object.defineProperty(chrome, 'i18n', {
        get: () => ({
          getMessage: () => '__LOCALIZED_STRING__',
        }),
      });
    }, mockStorage);

    await page.goto('file://' + path.join(lighthouseExtensionPath, 'popup.html'), {waitUntil: 'networkidle2'});
  }, 10 * 1000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should load without errors', async function() {
    expect(pageErrors).toHaveLength(0);
  });

  it('should generate the category checkboxes', async function() {
    const checkboxTitles =
      await page.$$eval('.options__categories li label span', els => els.map(e => e.textContent));
    const checkboxValues =
      await page.$$eval('.options__categories li label input', els => els.map(e => e.value));

    for (const {title, id} of DEFAULT_CATEGORIES) {
      expect(checkboxTitles).toContain(title);
      expect(checkboxValues).toContain(id);
    }
    expect(checkboxTitles).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(checkboxValues).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('should check the checkboxes based on settings', async function() {
    const enabledCategoriesFromSettings = Object.keys(mockStorage[STORAGE_KEYS.Categories])
      .filter(key => mockStorage[STORAGE_KEYS.Categories][key]);
    const expectedEnabledValues = [
      ...enabledCategoriesFromSettings,
      mockStorage[STORAGE_KEYS.Settings].device,
    ];

    const checkedValues = await page.$$eval('input:checked', els => els.map(e => e.value));
    for (const key of expectedEnabledValues) {
      expect(checkedValues).toContain(key);
    }
    expect(checkedValues).toHaveLength(expectedEnabledValues.length);
  });
});
