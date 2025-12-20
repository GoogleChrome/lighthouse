/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
/* eslint-disable new-cap */

/**
 * @fileoverview Example Jest tests for demonstrating how to run Lighthouse on an authenticated
 * page as integration tests. See docs/recipes/auth/README.md for more.
 */

/** @typedef {import('lighthouse/types/lhr')} LH */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const server = require('../auth/server/server.js');
const {login, logout} = require('../auth/example-lh-auth.js');

const CHROME_DEBUG_PORT = 8042;
const SERVER_PORT = 10632;
const ORIGIN = `http://localhost:${SERVER_PORT}`;

jest.setTimeout(30000);

// Provide a nice way to assert a score for a category.
// Note, you could just use `expect(lhr.categories.seo.score).toBeGreaterThanOrEqual(0.9)`,
// but by using a custom matcher a better error report is generated.
expect.extend({
  toHaveLighthouseScoreGreaterThanOrEqual(lhr, category, threshold) {
    const score = lhr.categories[category].score;
    const auditsRefsByWeight = [...lhr.categories[category].auditRefs]
      .filter((auditRef) => auditRef.weight > 0)
      .sort((a, b) => b.weight - a.weight);
    const report = auditsRefsByWeight.map((auditRef) => {
      const audit = lhr.audits[auditRef.id];
      const status = audit.score === 1 ?
        this.utils.EXPECTED_COLOR('○') :
        this.utils.RECEIVED_COLOR('✕');
      const weight = this.utils.DIM_COLOR(`[weight: ${auditRef.weight}]`);
      return `\t${status} ${weight} ${audit.id}`;
    }).join('\n');

    if (score >= threshold) {
      return {
        pass: true,
        message: () =>
          `expected category ${category} to be < ${threshold}, but got ${score}\n${report}`,
      };
    } else {
      return {
        pass: false,
        message: () =>
          `expected category ${category} to be >= ${threshold}, but got ${score}\n${report}`,
      };
    }
  },
});

/**
 * @param {string} url
 * @return {Promise<LH.Result>}
 */
async function runLighthouse(url) {
  const result = await lighthouse(url, {
    port: CHROME_DEBUG_PORT,
    disableStorageReset: true,
    onlyCategories: ['seo'],
  });
  return result.lhr;
}

describe('my site', () => {
  /** @type {import('puppeteer').Browser} */
  let browser;
  /** @type {import('puppeteer').Page} */
  let page;

  beforeAll(async () => {
    await new Promise(resolve => server.listen(SERVER_PORT, resolve));
    browser = await puppeteer.launch({
      args: [`--remote-debugging-port=${CHROME_DEBUG_PORT}`],
      headless: !process.env.DEBUG,
      slowMo: process.env.DEBUG ? 50 : undefined,
    });
  });

  afterAll(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
    await logout(browser, ORIGIN);
  });

  describe('/ logged out', () => {
    it('lighthouse', async () => {
      await page.goto(ORIGIN);
      const lhr = await runLighthouse(page.url());
      expect(lhr).toHaveLighthouseScoreGreaterThanOrEqual('seo', 0.9);
    });

    it('login form should exist', async () => {
      await page.goto(ORIGIN);
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
    });
  });

  describe('/ logged in', () => {
    it('lighthouse', async () => {
      await login(browser, ORIGIN);
      await page.goto(ORIGIN);
      const lhr = await runLighthouse(page.url());
      expect(lhr).toHaveLighthouseScoreGreaterThanOrEqual('seo', 0.9);
    });

    it('login form should not exist', async () => {
      await login(browser, ORIGIN);
      await page.goto(ORIGIN);
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      expect(emailInput).toBeFalsy();
      expect(passwordInput).toBeFalsy();
    });
  });

  describe('/dashboard logged out', () => {
    it('has no secrets', async () => {
      await page.goto(`${ORIGIN}/dashboard`);
      expect(await page.content()).not.toContain('secrets');
    });
  });

  describe('/dashboard logged in', () => {
    it('lighthouse', async () => {
      await login(browser, ORIGIN);
      await page.goto(`${ORIGIN}/dashboard`);
      const lhr = await runLighthouse(page.url());
      expect(lhr).toHaveLighthouseScoreGreaterThanOrEqual('seo', 0.9);
    });

    it('has secrets', async () => {
      await login(browser, ORIGIN);
      await page.goto(`${ORIGIN}/dashboard`);
      expect(await page.content()).toContain('secrets');
    });
  });
});
