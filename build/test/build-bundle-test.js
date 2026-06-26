/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';

import puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import {LH_ROOT} from '../../shared/root.js';
import {buildBundle} from '../build-bundle.js';

const TEST_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><title>Bundle Test</title></head>
<body>
  <h1>Bundle Test Page</h1>
</body>
</html>
`;

describe('Main Bundle build', () => {
  const bundlePath = `${LH_ROOT}/dist/lighthouse-test-bundle.js`;
  const minifiedBundlePath = `${LH_ROOT}/dist/lighthouse-test-bundle.min.js`;
  const entryPath = path.join(LH_ROOT, 'clients/devtools/devtools-entry.js');

  before(async () => {
    await buildBundle(entryPath, bundlePath, {minify: false});
    await buildBundle(entryPath, minifiedBundlePath, {minify: true});
  });

  after(() => {
    if (fs.existsSync(bundlePath)) fs.unlinkSync(bundlePath);
    if (fs.existsSync(bundlePath + '.map')) fs.unlinkSync(bundlePath + '.map');
    if (fs.existsSync(minifiedBundlePath)) fs.unlinkSync(minifiedBundlePath);
    if (fs.existsSync(minifiedBundlePath + '.map')) fs.unlinkSync(minifiedBundlePath + '.map');
  });

  it('bundle exists', () => {
    expect(fs.existsSync(bundlePath)).toBe(true);
    expect(fs.existsSync(minifiedBundlePath)).toBe(true);
  });

  it('bundle size is reasonable', () => {
    const code = fs.readFileSync(minifiedBundlePath, 'utf-8');
    expect(code.length).toBeLessThan(3_000_000); // 3 MB
  });

  it('bundle can run in a browser', async () => {
    const browser = await puppeteer.launch({
      executablePath: getChromePath(),
    });
    const page = await browser.newPage();
    await page.setContent(TEST_HTML);
    await page.waitForNetworkIdle();

    // devtools-entry.js expects `global` to be defined.
    await page.evaluate(() => {
      globalThis.global = globalThis;
    });

    // Inject the bundle
    await page.addScriptTag({path: bundlePath});

    // Verify Lighthouse is available on the window
    // devtools-entry.js sets self.snapshot (and others) in worker/non-worker environments.
    const isLighthouseAvailable = await page.evaluate(() => {
      // @ts-expect-error
      return typeof globalThis.snapshot === 'function';
    });

    await browser.close();
    expect(isLighthouseAvailable).toBe(true);
  });
});
