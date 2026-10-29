/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import puppeteer from 'puppeteer';
import {getChromePath} from 'chrome-launcher';

import {Server} from '../../cli/test/fixtures/static-server.js';
import {LH_ROOT} from '../../shared/root.js';

const debugOptions = JSON.parse(
  fs.readFileSync(LH_ROOT + '/treemap/app/debug.json', 'utf-8')
);
const portNumber = 20202;
const treemapUrl = `http://localhost:${portNumber}/dist/gh-pages/treemap/index.html`;

function getTextEncodingCode() {
  const code = fs.readFileSync(LH_ROOT + '/report/renderer/text-encoding.js', 'utf-8');
  return code.replace('export ', '');
}

describe('Lighthouse Treemap', () => {
  console.log('\n✨ Be sure to have recently run this: yarn build-treemap');

  /** @type {import('puppeteer').Browser} */
  let browser;
  /** @type {import('puppeteer').Page} */
  let page;
  /** @type {Array<string|Promise<string>>} */
  let pageErrors = [];

  let server;
  before(async function() {
    server = new Server(portNumber);
    await server.listen(portNumber, 'localhost');
  });

  after(async function() {
    await Promise.all([
      server.close(),
      browser && browser.close(),
    ]);
  });

  beforeEach(async () => {
    if (!browser) {
      browser = await puppeteer.launch({
        headless: process.env.DEBUG ? false : 'new',
        executablePath: getChromePath(),
      });
    }
    page = await browser.newPage();
    page.on('pageerror', e => pageErrors.push(`${e.message} ${e.stack}`));
    page.on('console', (e) => {
      if (e.type() === 'error' || e.type() === 'warning') {
        const describe = (jsHandle) => {
          return jsHandle.evaluate((obj) => {
            return JSON.stringify(obj, null, 2);
          });
        };
        const promise = Promise.all(e.args().map(describe)).then(args => {
          return `${e.text()} ${args.join(' ')} ${JSON.stringify(e.location(), null, 2)}`;
        });
        pageErrors.push(promise);
      }
    });
  });

  async function claimErrors() {
    await page.bringToFront();
    await page.evaluate(() => new Promise(window.requestAnimationFrame));
    const theErrors = pageErrors;
    pageErrors = [];
    return await Promise.all(theErrors);
  }

  async function ensureNoErrors() {
    const errors = (await claimErrors()).filter(error => {
      // Filters out a cookie deprecation error that only occurs on ToT
      // This error comes from gtag.js
      // https://support.google.com/tagmanager/thread/288419928/error-failed-to-execute-getvalue-on-cookiedeprecationlabel?hl=en
      return !error.match(
        /Failed to execute 'getValue' on 'CookieDeprecationLabel': Illegal invocation/);
    });
    expect(errors).toHaveLength(0);
  }

  afterEach(/** @this {Mocha.Context} */ async function() {
    try {
      if (this.currentTest?.state === 'passed') {
        await ensureNoErrors();
      } else {
        pageErrors = [];
      }
    } finally {
      await page.close();
    }
  });

  describe('Recieves options', () => {
    it('from debug data', async () => {
      await page.goto(`${treemapUrl}?debug`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      const options = await page.evaluate(() => window.__treemapOptions);
      expect(options.lhr.finalDisplayedUrl).toBe(debugOptions.lhr.finalDisplayedUrl);
    });

    /**
     * @param {{options: any, usesGzip: boolean}}
     */
    async function loadFromEncodedUrl({options, useGzip}) {
      const json = JSON.stringify(options);
      const encoded = await page.evaluate(`
        ${getTextEncodingCode()}
        TextEncoding.toBase64(${JSON.stringify(json)}, {gzip: ${useGzip}});
      `);
      await page.goto(`${treemapUrl}?gzip=${useGzip ? '1' : '0'}#${encoded}`);
      await page.waitForFunction(() => {
        if (window.__treemapOptions) return true;

        const el = document.querySelector('#lh-log');
        if (el && el.textContent.startsWith('Error')) return true;
      });
    }

    it('from encoded fragment (no gzip)', async () => {
      const options = JSON.parse(JSON.stringify(debugOptions));
      options.lhr.finalDisplayedUrl += '😃😃😃';
      await loadFromEncodedUrl({options, usesGzip: false});

      const optionsInPage = await page.evaluate(() => window.__treemapOptions);
      expect(optionsInPage.lhr.finalDisplayedUrl).toBe(options.lhr.finalDisplayedUrl);
    });

    it('from encoded fragment (gzip)', async () => {
      const options = JSON.parse(JSON.stringify(debugOptions));
      options.lhr.finalDisplayedUrl += '😃😃😃';
      await loadFromEncodedUrl({options, usesGzip: true});

      const optionsInPage = await page.evaluate(() => window.__treemapOptions);
      expect(optionsInPage.lhr.finalDisplayedUrl).toBe(options.lhr.finalDisplayedUrl);
    });

    describe('handles errors', () => {
      const errorTestCases = [
        {
          options: {lhr: 'lol'},
          error: 'Error: provided json is not a Lighthouse result',
        },
        {
          options: {lhr: {noaudits: {}}},
          error: 'Error: provided json is not a Lighthouse result',
        },
        {
          options: {lhr: {audits: {}}},
          error: 'Error: provided Lighthouse result is missing audit: `script-treemap-data`',
        },
      ];
      for (let i = 0; i < errorTestCases.length; i++) {
        it(`case #${i + 1}`, async () => {
          const testCase = errorTestCases[i];
          await loadFromEncodedUrl({options: testCase.options, usesGzip: false});
          const optionsInPage = await page.evaluate(() => window.__treemapOptions);
          expect(optionsInPage).toBeUndefined();
          const error = await page.evaluate(() => document.querySelector('#lh-log').textContent);
          expect(error).toBe(testCase.error);
          const errors = await claimErrors();
          expect(errors).toHaveLength(1);
          expect(errors[0]).toContain(testCase.error);
        });
      }
    });
  });

  describe('renders correctly', () => {
    it('correctly shades coverage of gtm node', async () => {
      await page.goto(`${treemapUrl}?debug`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await page.select('.view-mode-selector', '1'); // unused bytes
      await page.waitForSelector('.lh-treemap--view-mode--unused-bytes');

      // Identify the JS data.
      const gtmNode = await page.evaluate(() => {
        const d1Nodes = window.__treemapOptions.lhr.audits['script-treemap-data'].details.nodes;
        const gtmNode = d1Nodes.find(n => n.name.includes('gtm.js'));
        return gtmNode;
      });

      expect(gtmNode.unusedBytes).toBeGreaterThan(20_000);
      expect(gtmNode.resourceBytes).toBeGreaterThan(20_000);

      // Identify the DOM node.
      const gtmElemHandle = await page.evaluateHandle(() => {
        const captionEls = Array.from(document.querySelectorAll('.webtreemap-caption'));
        return captionEls.find(el => el.textContent.includes('gtm.js')).parentElement;
      });

      expect(await gtmElemHandle.isIntersectingViewport()).toBeTruthy();

      // Determine visual red shading percentage.
      const percentRed = await gtmElemHandle.evaluate(node => {
        const redWidthPx = parseInt(window.getComputedStyle(node, ':before').width);
        const completeWidthPx = node.getBoundingClientRect().width;
        return redWidthPx / completeWidthPx;
      });

      // Reminder! UNUSED == RED
      const percentDataUnused = gtmNode.unusedBytes / gtmNode.resourceBytes;
      expect(percentDataUnused).toBeGreaterThan(0);

      // Assert 0.2520 ~= 0.2602 w/ 1 decimal place of precision.
      // CSS pixels won't let us go to 2 decimal places.
      expect(percentRed).toBeApproximately(percentDataUnused, 1);
    });

    it('formats captions on initial render and after zooming', async () => {
      await page.goto(`${treemapUrl}?debug`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const getUnformattedCaptions = () => page.evaluate(() => {
        return Array.from(document.querySelectorAll('.webtreemap-caption'))
          .filter(el => !el.querySelector('.lh-text-bold') || el.textContent.includes(' · '))
          .map(el => el.textContent);
      });

      expect(await getUnformattedCaptions()).toEqual([]);

      // Click on a bundle caption to zoom in and create new child DOM nodes.
      const bundleCaption = await page.evaluateHandle(() => {
        const captionEls = Array.from(document.querySelectorAll('.webtreemap-caption'));
        return captionEls.find(el => el.textContent.includes('coursehero.com/ssi/6.'));
      });
      await bundleCaption.click();

      expect(await getUnformattedCaptions()).toEqual([]);
    });

    it('shows back button when zoomed in and navigates back to top level on click', async () => {
      await page.goto(`${treemapUrl}?debug`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const isBackVisible = () => page.evaluate(() => {
        const el = document.querySelector('.lh-button--back');
        return el ? window.getComputedStyle(el).display !== 'none' : false;
      });
      const isTitleVisible = () => page.evaluate(() => {
        const el = document.querySelector('.lh-header--title');
        return el ? window.getComputedStyle(el).display !== 'none' : false;
      });

      expect(await isBackVisible()).toBe(false);
      expect(await isTitleVisible()).toBe(true);

      const bundleCaption = await page.evaluateHandle(() => {
        const captionEls = Array.from(document.querySelectorAll('.webtreemap-caption'));
        return captionEls.find(el => el.textContent.includes('coursehero.com/ssi/6.'));
      });
      const getStyleWidth = () => bundleCaption.evaluate(el => {
        return parseInt(el.parentElement.style.width);
      });
      const initialWidth = await getStyleWidth();

      await bundleCaption.click();

      expect(await isBackVisible()).toBe(true);
      expect(await isTitleVisible()).toBe(false);
      expect(await getStyleWidth()).toBeGreaterThan(initialWidth);

      await page.click('.lh-button--back');

      expect(await isBackVisible()).toBe(false);
      expect(await isTitleVisible()).toBe(true);
      expect(await getStyleWidth()).toBe(initialWidth);
    });

    describe('duplicate modules', () => {
      const getHoverState = () => page.evaluate(() => {
        const treemapEl = document.querySelector('.lh-treemap');
        const dupeEls = Array.from(document.querySelectorAll('.webtreemap-node--duplicate'));
        const leafEls = Array.from(document.querySelectorAll('.webtreemap-node'))
          .filter(el => !el.querySelector('.webtreemap-node'));
        const isWhite = el => el.style.backgroundColor === 'white';
        return {
          hovering: treemapEl.classList.contains('lh-treemap--hover-duplicate'),
          coloredDupes: dupeEls.filter(el => !isWhite(el)).length,
          coloredNonDupes: leafEls
            .filter(el => !el.classList.contains('webtreemap-node--duplicate'))
            .filter(el => !isWhite(el)).length,
          colored: Array.from(document.querySelectorAll('.webtreemap-node'))
            .filter(el => !el.classList.contains('webtreemap-node--root'))
            .filter(el => !isWhite(el)).length,
        };
      });

      it('outlines duplicate modules in every view mode', async () => {
        await page.setViewport({width: 1440, height: 960});
        await page.goto(`${treemapUrl}?debug`, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        for (const viewModeIndex of ['0', '1', '2']) {
          await page.select('.view-mode-selector', viewModeIndex);
          const borders = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.webtreemap-node--duplicate'))
              .map(el => window.getComputedStyle(el).borderTopColor);
          });
          expect(borders.length).toBeGreaterThan(0);
          for (const border of borders) {
            expect(border).toBe('rgb(33, 33, 33)');
          }
        }
      });

      it('highlights all copies of a duplicate module on hover', async () => {
        await page.setViewport({width: 1440, height: 960});
        await page.goto(`${treemapUrl}?debug`, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        // Pick the largest duplicate module node so it is hoverable.
        const dupeEl = await page.evaluateHandle(() => {
          const els = Array.from(document.querySelectorAll('.webtreemap-node--duplicate'));
          const area = el => el.getBoundingClientRect().width * el.getBoundingClientRect().height;
          return els.sort((a, b) => area(b) - area(a))[0];
        });

        const beforeState = await getHoverState();
        expect(beforeState.hovering).toBe(false);

        await dupeEl.hover();
        const hoverState = await getHoverState();
        expect(hoverState.hovering).toBe(true);
        expect(hoverState.coloredDupes).toBe(1);
        // Copies too small to render are shown by highlighting their closest rendered ancestor.
        expect(hoverState.colored).toBeLessThan(beforeState.colored);

        await page.mouse.move(0, 0);
        const afterState = await getHoverState();
        expect(afterState.hovering).toBe(false);
        expect(afterState.coloredNonDupes).toBeGreaterThan(0);
      });

      it('groups the table by module, sorted by duplicated bytes', async () => {
        await page.setViewport({width: 1440, height: 960});
        await page.goto(`${treemapUrl}?debug`, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        await page.select('.view-mode-selector', '2'); // duplicate modules
        await page.waitForSelector('.lh-treemap--view-mode--duplicate-modules');

        const groups = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.lh-table-row--group')).map(el => {
            let numSubrows = 0;
            let sibling = el.nextElementSibling;
            while (sibling?.classList.contains('lh-table-subrow')) {
              numSubrows += 1;
              sibling = sibling.nextElementSibling;
            }
            const bytes = Number(el.children[1].title.replace(/[^\d]/g, ''));
            return {bytes, numSubrows};
          });
        });

        expect(groups.length).toBeGreaterThan(1);
        for (let i = 0; i < groups.length; i++) {
          expect(groups[i].numSubrows).toBeGreaterThan(1);
          if (i > 0) expect(groups[i].bytes).toBeLessThanOrEqual(groups[i - 1].bytes);
        }

        // Hovering a group row highlights its module in the treemap.
        await page.hover('.lh-table-row--group > div:first-child');
        const hoverState = await getHoverState();
        expect(hoverState.hovering).toBe(true);
        expect(hoverState.colored).toBeGreaterThan(0);
      });

      it('shows a hint for copies outside the zoomed-in view', async () => {
        await page.setViewport({width: 1440, height: 960});
        await page.goto(`${treemapUrl}?debug`, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        const getHint = () => page.evaluate(() => {
          const el = document.querySelector('.lh-treemap-hint');
          return el.classList.contains('hidden') ? null : el.textContent;
        });

        // Zoom into a bundle. The other copy of popover.js is in a different bundle.
        const bundleCaption = await page.evaluateHandle(() => {
          const captionEls = Array.from(document.querySelectorAll('.webtreemap-caption'));
          return captionEls.find(el => el.textContent.includes('coursehero.com/ssi/6.'));
        });
        await bundleCaption.click();

        const popoverEl = await page.evaluateHandle(() => {
          const captionEls = Array.from(document.querySelectorAll('.webtreemap-caption'));
          return captionEls.find(el => el.textContent.startsWith('popover/popover.js'))
            .parentElement;
        });
        // Wait for the zoom transition to finish (position stops changing).
        await popoverEl.evaluate(el => new Promise(resolve => {
          let prev = '';
          let stableFrames = 0;
          const check = () => {
            const rect = el.getBoundingClientRect();
            const current = `${rect.left},${rect.top},${rect.width},${rect.height}`;
            stableFrames = current === prev ? stableFrames + 1 : 0;
            prev = current;
            if (stableFrames >= 3) resolve();
            else requestAnimationFrame(check);
          };
          check();
        }));
        await popoverEl.hover();
        expect(await getHint()).toBe('Copies outside this view: 1');

        await page.mouse.move(0, 0);
        expect(await getHint()).toBe(null);
      });

      it('does not fade out everything when no copy of the module is rendered', async () => {
        await page.setViewport({width: 1440, height: 960});
        await page.goto(`${treemapUrl}?debug`, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        // Neither copy of this module is big enough to be rendered at the top level.
        const name = 'node_modules/@formatjs/icu-messageformat-parser/lib/parser.js';
        const cell = await page.evaluateHandle(name => {
          return Array.from(document.querySelectorAll('.lh-table-row > div:first-child'))
            .find(el => el.textContent.endsWith(name));
        }, name);
        await cell.evaluate(el => el.scrollIntoView({block: 'center'}));
        await cell.hover();

        const hoverState = await getHoverState();
        expect(hoverState.hovering).toBe(true);
        expect(hoverState.colored).toBeGreaterThan(0);
      });
    });
  });
});
