/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Example script for running Lighthouse on an authenticated page.
 * See docs/recipes/auth/README.md for more.
 */

import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import esMain from 'es-main';

/**
 * @param {puppeteer.Page} page
 * @param {string} origin
 */
async function login(page, origin) {
  await page.goto(origin);
  await page.waitForSelector('input[type="email"]', {visible: true});

  // Fill in and submit login form.
  const emailInput = await page.$('input[type="email"]');
  await emailInput.type('admin@example.com');
  const passwordInput = await page.$('input[type="password"]');
  await passwordInput.type('password');
  await Promise.all([
    page.$eval('.login-form', form => form.submit()),
    page.waitForNavigation(),
  ]);
}

/**
 * @param {puppeteer.Page} page
 * @param {string} origin
 */
async function logout(page, origin) {
  await page.goto(`${origin}/logout`);
}

async function main() {
  // Direct Puppeteer to open Chrome with a specific debugging port.
  const browser = await puppeteer.launch({
    // Set DEBUG environment variable if you want to see the tests in action.
    headless: process.env.DEBUG ? false : 'new',
    slowMo: 50,
  });
  const page = await browser.newPage();

  // Setup the browser session to be logged into our site.
  await login(page, 'http://localhost:10632');

  // The local server is running on port 10632.
  const url = 'http://localhost:10632/dashboard';

  // Direct Lighthouse to use the same Puppeteer page.
  // Disable storage reset so login session is preserved.
  const result = await lighthouse(url, {disableStorageReset: true}, undefined, page);

  // Direct Puppeteer to close the browser as we're done with it.
  await browser.close();

  // Output the result.
  console.log(JSON.stringify(result.lhr, null, 2));
}

if (esMain(import.meta)) {
  await main();
}

export {
  login,
  logout,
};
