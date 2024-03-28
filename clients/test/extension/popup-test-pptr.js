/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';

import puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import {DEFAULT_CATEGORIES, STORAGE_KEYS} from '../../extension/scripts/settings-controller.js';
import {LH_ROOT} from '../../../shared/root.js';

const lighthouseExtensionPath = path.resolve(LH_ROOT, 'dist/extension-chrome');

const mockStorage = {
  [STORAGE_KEYS.Categories]: {
    'performance': true,
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
  let pageErrors = [];

  async function claimErrors() {
    const theErrors = pageErrors;
    pageErrors = [];
    return await Promise.all(theErrors);
  }

  async function ensureNoErrors() {
    await page.bringToFront();
    await page.evaluate(() => new Promise(window.requestAnimationFrame));
    const errors = await claimErrors();
    expect(errors).toHaveLength(0);
  }

  before(async function() {
    // start puppeteer
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
    });

    page = await browser.newPage();
    page.on('pageerror', e => pageErrors.push(`${e.message} ${e.stack}`));
    page.on('console', (e) => {
      if (e.type() === 'error' || e.type() === 'warning') {
        const describe = (jsHandle) => {
          return jsHandle.executionContext().evaluate((obj) => {
            return JSON.stringify(obj, null, 2);
          }, jsHandle);
        };
        const promise = Promise.all(e.args().map(describe)).then(args => {
          return `${e.text()} ${args.join(' ')} ${JSON.stringify(e.location(), null, 2)}`;
        });
        pageErrors.push(promise);
      }
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

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should load without errors', async function() {
    await ensureNoErrors();
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
      'psi',
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
