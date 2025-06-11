/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable new-cap */

/**
 * @fileoverview Example Mocha tests for demonstrating how to run Lighthouse on an authenticated
 * page as integration tests. See docs/recipes/auth/README.md for more.
 */

/** @typedef {import('lighthouse/types/lhr')} LH */

import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import {expect} from 'expect';
import {getChromePath} from 'chrome-launcher';

import server from '../auth/server/server.js';
import {login, logout} from '../auth/example-lh-auth.js';

const CHROME_DEBUG_PORT = 8042;
const SERVER_PORT = 10632;
const ORIGIN = `http://localhost:${SERVER_PORT}`;

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
      const attrs = this.utils.DIM_COLOR(`[weight: ${auditRef.weight}, score: ${audit.score}]`);
      const error = audit.errorMessage ? ` ${audit.errorMessage}` : '';
      return `\t${status} ${attrs} ${audit.id}${error}`;
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

  before(async () => {
    await new Promise(resolve => server.listen(SERVER_PORT, resolve));
    browser = await puppeteer.launch({
      args: [`--remote-debugging-port=${CHROME_DEBUG_PORT}`],
      headless: process.env.DEBUG ? false : 'new',
      slowMo: process.env.DEBUG ? 50 : undefined,
      executablePath: getChromePath(),
    });
  });

  after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await logout(page, ORIGIN);
    await page.close();
  });

  describe('/ logged out', () => {
    it('lighthouse', async () => {
      await page.goto(ORIGIN);
      const lhr = await runLighthouse(page.url());
      expect(lhr).toHaveLighthouseScoreGreaterThanOrEqual('seo', 0.8);
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
      await login(page, ORIGIN);
      await page.goto(ORIGIN);
      const lhr = await runLighthouse(page.url());
      expect(lhr).toHaveLighthouseScoreGreaterThanOrEqual('seo', 0.8);
    });

    it('login form should not exist', async () => {
      await login(page, ORIGIN);
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
      await login(page, ORIGIN);
      await page.goto(`${ORIGIN}/dashboard`);
      const lhr = await runLighthouse(page.url());
      expect(lhr).toHaveLighthouseScoreGreaterThanOrEqual('seo', 0.8);
    });

    it('has secrets', async () => {
      await login(page, ORIGIN);
      await page.goto(`${ORIGIN}/dashboard`);
      expect(await page.content()).toContain('secrets');
    });
  });
});
