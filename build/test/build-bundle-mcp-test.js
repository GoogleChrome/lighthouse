/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';

import puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import {Server} from '../../cli/test/fixtures/static-server.js';
import {LH_ROOT} from '../../shared/root.js';
import {buildBundle} from '../build-bundle-mcp.js';

const TEST_HTML = `
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

/** Categories included in the MCP bundle (accessibility, SEO, Best practices). */
const MCP_CATEGORIES = ['accessibility', 'seo', 'best-practices'];

describe('MCP Bundle build', () => {
  const bundlePath = `${LH_ROOT}/dist/lighthouse-devtools-mcp-bundle.js`;
  const entryPath = path.join(LH_ROOT, 'clients/devtools-mcp/devtools-mcp-entry.js');

  before(async () => {
    await buildBundle(entryPath, bundlePath);
  });

  it('bundle exists', () => {
    expect(fs.existsSync(bundlePath)).toBe(true);
  });

  it('bundle has correct exports', async () => {
    const mcpBundle = await import(bundlePath);
    expect(typeof mcpBundle.navigation).toBe('function');
    expect(typeof mcpBundle.snapshot).toBe('function');
    expect(typeof mcpBundle.generateReport).toBe('function');
  });

  describe('snapshot', () => {
    it('successfully runs snapshot on a local page', async () => {
      const {snapshot} = await import(bundlePath);
      const browser = await puppeteer.launch({
        executablePath: getChromePath(),
      });
      const page = await browser.newPage();
      await page.setContent(TEST_HTML, {waitUntil: 'networkidle0'});

      const result = await snapshot(page, {
        config: {
          extends: 'lighthouse:default',
          settings: {
            onlyCategories: MCP_CATEGORIES,
          },
        },
      });

      await browser.close();

      expect(result).toBeDefined();
      // All requested categories are present in the results
      for (const categoryId of MCP_CATEGORIES) {
        expect(result.lhr.categories).toHaveProperty(categoryId);
        expect(result.lhr.categories[categoryId]).toHaveProperty('score');
      }
      // The page has 1 failing a11y audit (button name), so accessibility score should be < 1.0
      expect(result.lhr.categories.accessibility.score).toBeLessThan(1.0);
      expect(result.lhr.categories.accessibility.score).toBeGreaterThan(0.5);
    });
  });

  describe('navigation', () => {
    it('successfully runs navigation', async () => {
      const {navigation} = await import(bundlePath);

      const testPageDir = path.join(LH_ROOT, '.tmp');
      if (!fs.existsSync(testPageDir)) {
        fs.mkdirSync(testPageDir, {recursive: true});
      }
      const testPagePath = path.join(testPageDir, 'a11y-test.html');
      fs.writeFileSync(testPagePath, TEST_HTML);

      const server = new Server(0);
      server.baseDir = testPageDir;
      await server.listen(0, 'localhost');
      const testUrl = `http://localhost:${server.getPort()}/${path.basename(testPagePath)}`;

      try {
        const browser = await puppeteer.launch({
          executablePath: getChromePath(),
        });
        const page = await browser.newPage();

        const result = await navigation(page, testUrl, {
          config: {
            extends: 'lighthouse:default',
            settings: {
              onlyCategories: MCP_CATEGORIES,
            },
          },
        });

        await browser.close();

        expect(result).toBeDefined();
        // All requested categories are present in the results
        for (const categoryId of MCP_CATEGORIES) {
          expect(result?.lhr.categories).toHaveProperty(categoryId);
          expect(result?.lhr.categories[categoryId]).toHaveProperty('score');
        }
        expect(result?.lhr.categories.accessibility.score).toBeLessThan(1.0);
        expect(result?.lhr.categories.accessibility.score).toBeGreaterThan(0.5);
      } finally {
        await server.close();
        if (fs.existsSync(testPagePath)) fs.unlinkSync(testPagePath);
      }
    });
  });

  describe('generateReport', () => {
    it('generates HTML report from LHR result', async () => {
      const {snapshot, generateReport} = await import(bundlePath);

      const browser = await puppeteer.launch({
        executablePath: getChromePath(),
      });
      const page = await browser.newPage();
      await page.setContent(TEST_HTML, {waitUntil: 'networkidle0'});

      const result = await snapshot(page, {
        config: {
          extends: 'lighthouse:default',
          settings: {
            onlyCategories: MCP_CATEGORIES,
          },
        },
      });

      await browser.close();

      const html = generateReport(result.lhr, 'html');
      expect(typeof html).toBe('string');
      expect(html).toContain('Lighthouse');
      expect(html.length).toBeGreaterThan(1000);
    });

    it('generates JSON report from LHR result', async () => {
      const {snapshot, generateReport} = await import(bundlePath);

      const browser = await puppeteer.launch({
        executablePath: getChromePath(),
      });
      const page = await browser.newPage();
      await page.setContent(TEST_HTML, {waitUntil: 'networkidle0'});

      const result = await snapshot(page, {
        config: {
          extends: 'lighthouse:default',
          settings: {
            onlyCategories: MCP_CATEGORIES,
          },
        },
      });

      await browser.close();

      const json = generateReport(result.lhr, 'json');
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('categories');
      // All requested categories are present in the results
      for (const categoryId of MCP_CATEGORIES) {
        expect(parsed.categories).toHaveProperty(categoryId);
      }
    });
  });
});
