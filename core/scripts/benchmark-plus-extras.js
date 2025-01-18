/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview This script computes the BenchmarkIndex and a few other related browser benchmarks.
 * node core/scripts/benchmark-plus-extras.js
 */

/* global document */

import * as puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import {pageFunctions} from '../lib/page-functions.js';

/** @param {puppeteer.Page} page */
async function runOctane(page) {
  /** @param {puppeteer.ConsoleMessage} message */
  const pageLogger = message => process.stdout.write(`  ${message.text()}\n`);

  process.stdout.write(`Running Octane...\n`);
  await page.goto('https://chromium.github.io/octane/', {waitUntil: 'networkidle0'});
  await page.waitForSelector('#run-octane');
  await new Promise(r => setTimeout(r, 5000));
  page.on('console', pageLogger);
  await page.click('#run-octane');
  await page.waitForFunction(() => {
    const banner = document.querySelector('#main-banner');
    return /Octane Score: \d+/.test(banner?.textContent || '');
  }, {timeout: 300e3});

  const score = await page.evaluate(() => {
    const banner = document.querySelector('#main-banner');
    if (!banner || !banner.textContent) return 0;
    const [_, score] = banner.textContent.match(/Octane Score: (\d+)/) || [];
    return Number(score);
  });
  process.stdout.write(`  Octane: ${score}\n`);

  page.off('console', pageLogger);
}

/** @param {puppeteer.Page} page */
async function runSpeedometer(page) {
  process.stdout.write(`Running Speedometer...\n`);
  await page.goto('https://browserbench.org/Speedometer2.0/', {waitUntil: 'networkidle0'});
  await page.waitForSelector('#home button');
  await new Promise(r => setTimeout(r, 5000));
  await page.click('#home button');

  const loggerInterval = setInterval(async () => {
    const progress = await page.evaluate(() => {
      const infoEl = document.querySelector('#running #info');
      return infoEl?.textContent || 'Unknown';
    });
    process.stdout.write(`  Progress: ${progress}\n`);
  }, 10000);

  await page.waitForSelector('#summarized-results.selected', {timeout: 600e3});
  clearInterval(loggerInterval);

  const score = await page.evaluate(() => {
    const result = document.querySelector('#result-number');
    if (!result || !result.textContent) return 0;
    return Number(result.textContent);
  });
  process.stdout.write(`  Speedometer: ${score}\n`);
}

async function main() {
  process.stdout.write(`Launching Chrome...\n`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: getChromePath(),
  });

  const page = await browser.newPage();
  await page.goto('about:blank');

  process.stdout.write(`Running BenchmarkIndex...\n`);
  for (let i = 0; i < 10; i++) {
    const BenchmarkIndex = await page.evaluate(pageFunctions.computeBenchmarkIndex);
    process.stdout.write(`  ${i + 1}: BenchmarkIndex=${BenchmarkIndex}\n`);
  }

  await runOctane(page);
  await runSpeedometer(page);
  await browser.close();
}

await main();
