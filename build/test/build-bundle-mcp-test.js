/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';

import {LH_ROOT} from '../../shared/root.js';

describe('MCP Bundle build', () => {
  const bundlePath = `${LH_ROOT}/dist/lighthouse-devtools-mcp-bundle.js`;

  it('bundle exists', () => {
    expect(fs.existsSync(bundlePath)).toBe(true);
  });

  it('bundle has correct exports', async () => {
    const mcpBundle = await import(bundlePath);
    expect(typeof mcpBundle.lighthouse).toBe('function');
    expect(typeof mcpBundle.navigation).toBe('function');
    expect(typeof mcpBundle.snapshot).toBe('function');
    expect(typeof mcpBundle.generateReport).toBe('function');
  });

  describe('Functional Verification (Puppeteer)', () => {
    it('successfully runs accessibility audits on a local page', async () => {
      const {lighthouse} = await import(bundlePath);
      const puppeteer = (await import('puppeteer')).default;
      const {launch} = await import('chrome-launcher');
      const {Server} = await import('../../cli/test/fixtures/static-server.js');

      // Create a simple test page with accessibility issues
      const testPagePath = path.join(LH_ROOT, '.tmp', 'a11y-test.html');
      if (!fs.existsSync(path.dirname(testPagePath))) fs.mkdirSync(path.dirname(testPagePath));
      fs.writeFileSync(testPagePath, `
        <!DOCTYPE html>
        <html lang="en">
        <head><title>A11y Test</title></head>
        <body>
          <h1>Accessibility Test Page</h1>
          <!-- Failing audit: Buttons should have an accessible name -->
          <button id="fail-btn"></button>
        </body>
        </html>
      `);

      const server = new Server(0);
      server.baseDir = path.dirname(testPagePath);
      await server.listen(0, 'localhost');
      const serverPort = server.getPort();

      const chrome = await launch({
        chromeFlags: ['--headless', '--no-sandbox'],
      });

      try {
        const browser = await puppeteer.connect({
          browserURL: `http://localhost:${chrome.port}`,
        });

        const result = await lighthouse(`http://localhost:${serverPort}/${path.basename(testPagePath)}`, {
          port: chrome.port,
        }, {
          extends: 'lighthouse:default',
          settings: {
            onlyCategories: ['accessibility'],
          },
        });

        // The page has 1 failing audit (button name), so score should be < 1.0
        expect(result.lhr.categories.accessibility.score).toBeLessThan(1.0);
        expect(result.lhr.categories.accessibility.score).toBeGreaterThan(0.5);

        await browser.disconnect();
      } finally {
        await chrome.kill();
        await server.close();
        if (fs.existsSync(testPagePath)) fs.unlinkSync(testPagePath);
      }
    });
  });
});
