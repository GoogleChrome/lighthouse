/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';

import {LH_ROOT} from '../../shared/root.js';

const A11Y_TEST_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><title>A11y Test</title></head>
<body>
  <h1>Accessibility Test Page</h1>
  <!-- Failing audit: Buttons should have an accessible name -->
  <button id="fail-btn"></button>
</body>
</html>
`;

describe('MCP Bundle build', () => {
  const bundlePath = `${LH_ROOT}/dist/lighthouse-devtools-mcp-bundle.js`;

  it('bundle exists', () => {
    expect(fs.existsSync(bundlePath)).toBe(true);
  });

  it('bundle has correct exports', async () => {
    const mcpBundle = await import(bundlePath);
    expect(typeof mcpBundle.navigation).toBe('function');
    expect(typeof mcpBundle.snapshot).toBe('function');
    expect(typeof mcpBundle.generateReport).toBe('function');
  });

  describe('accessibility snapshot', () => {
    it('successfully runs snapshot on a local page', async () => {
      const {snapshot} = await import(bundlePath);
      const puppeteer = (await import('puppeteer')).default;

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(A11Y_TEST_HTML, {waitUntil: 'networkidle0'});

      const result = await snapshot(page, {
        config: {
          extends: 'lighthouse:default',
          settings: {
            onlyCategories: ['accessibility'],
          },
        },
      });

      await browser.close();

      expect(result).toBeDefined();
      expect(result.lhr.categories.accessibility).toBeDefined();
      // The page has 1 failing audit (button name), so score should be < 1.0
      expect(result.lhr.categories.accessibility.score).toBeLessThan(1.0);
      expect(result.lhr.categories.accessibility.score).toBeGreaterThan(0.5);
    });
  });

  describe('navigation', () => {
    it('successfully runs navigation with temp file', async () => {
      const {navigation} = await import(bundlePath);
      const puppeteer = (await import('puppeteer')).default;
      const {Server} = await import('../../cli/test/fixtures/static-server.js');

      const testPageDir = path.join(LH_ROOT, '.tmp');
      if (!fs.existsSync(testPageDir)) {
        fs.mkdirSync(testPageDir, {recursive: true});
      }
      const testPagePath = path.join(testPageDir, 'a11y-test.html');
      fs.writeFileSync(testPagePath, A11Y_TEST_HTML);

      const server = new Server(0);
      server.baseDir = testPageDir;
      await server.listen(0, 'localhost');
      const testUrl = `http://localhost:${server.getPort()}/${path.basename(testPagePath)}`;

      try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        const result = await navigation(page, testUrl, {
          config: {
            extends: 'lighthouse:default',
            settings: {
              onlyCategories: ['accessibility'],
            },
          },
        });

        await browser.close();

        expect(result).toBeDefined();
        expect(result?.lhr.categories.accessibility).toBeDefined();
        expect(result?.lhr.categories.accessibility.score).toBeLessThan(1.0);
        expect(result?.lhr.categories.accessibility.score).toBeGreaterThan(0.5);
      } finally {
        await server.close();
        if (fs.existsSync(testPagePath)) fs.unlinkSync(testPagePath);
      }
    });
  });
});
