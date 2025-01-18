/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import assert from 'assert/strict';

import puppeteer from 'puppeteer';
import {expect} from 'expect';
import {getChromePath} from 'chrome-launcher';

import {Server} from '../../cli/test/fixtures/static-server.js';
import defaultConfig from '../../core/config/default-config.js';
import {LH_ROOT} from '../../shared/root.js';
import {getCanonicalLocales} from '../../shared/localization/format.js';
import {getProtoRoundTrip} from '../../core/test/test-utils.js';

const {itIfProtoExists} = getProtoRoundTrip();

const portNumber = 10200;
const viewerUrl = `http://localhost:${portNumber}/dist/gh-pages/viewer/index.html`;
const sampleLhr = LH_ROOT + '/core/test/results/sample_v2.json';
// eslint-disable-next-line max-len
const sampleFlowResult = LH_ROOT + '/core/test/fixtures/user-flows/reports/sample-flow-result.json';

const lighthouseCategories = Object.keys(defaultConfig.categories);
const getAuditsOfCategory = category => defaultConfig.categories[category].auditRefs;

// TODO: should be combined in some way with clients/test/extension/extension-test.js
describe('Lighthouse Viewer', () => {
  // eslint-disable-next-line no-console
  console.log('\n✨ Be sure to have recently run this: yarn build-viewer');

  /** @type {import('puppeteer').Browser} */
  let browser;
  /** @type {import('puppeteer').Page} */
  let viewerPage;
  let pageErrors = [];

  const selectors = {
    audits: '.lh-audit, .lh-metric',
    titles: '.lh-audit__title, .lh-metric__title',
  };

  function getAuditElementsIds({category, selector}) {
    return viewerPage.evaluate(
      ({category, selector}) => {
        const elems = document.querySelector(`#${category}`).parentNode.querySelectorAll(selector);
        return Array.from(elems).map(el => el.id);
      }, {category, selector}
    );
  }

  function getCategoryElementsIds() {
    return viewerPage.evaluate(
      () => {
        return Array.from(document.querySelectorAll(`.lh-category`)).map(el => el.id);
      });
  }

  let server;
  before(async () => {
    server = new Server(portNumber);
    await server.listen(portNumber, 'localhost');

    // start puppeteer
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
    });
    viewerPage = await browser.newPage();
    viewerPage.on('pageerror', e => pageErrors.push(`${e.message} ${e.stack}`));
    viewerPage.on('console', (e) => {
      if (e.type() === 'error' || e.type() === 'warning') {
        // TODO gotta upgrade our own stuff.
        if (e.text().includes('Please adopt the new report API')) return;
        // Rendering a report from localhost page will attempt to display unreachable resources.
        if (e.location().url.includes('lighthouse-480x318.jpg')) return;

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
  });

  after(async function() {
    await Promise.all([
      server.close(),
      browser && browser.close(),
    ]);
  });

  async function claimErrors() {
    const theErrors = pageErrors;
    pageErrors = [];
    return await Promise.all(theErrors);
  }

  async function ensureNoErrors() {
    await viewerPage.bringToFront();
    await viewerPage.evaluate(() => new Promise(window.requestAnimationFrame));
    const errors = await claimErrors();
    if (errors.length) {
      assert.fail('errors from page:\n\n' + errors.map(e => e.toString()).join('\n\n'));
    }
  }

  afterEach(async function() {
    // Tests should call this themselves so the failure is associated with them in the test report,
    // but just in case one is missed it won't hurt to repeat the check here.
    await ensureNoErrors();
  });

  describe('Renders the flow report', () => {
    before(async () => {
      await viewerPage.goto(viewerUrl, {waitUntil: 'networkidle2', timeout: 30000});
      const fileInput = await viewerPage.$('#hidden-file-input');
      await fileInput.uploadFile(sampleFlowResult);
      await viewerPage.waitForSelector('.App', {timeout: 30000});
    });

    it('should load with no errors', async () => {
      await ensureNoErrors();
    });

    it('renders the summary page', async () => {
      const summary = await viewerPage.evaluate(() => document.querySelector('.Summary'));
      assert.ok(summary);

      const scores = await viewerPage.evaluate(() =>
        Array.from(document.querySelectorAll('.lh-gauge__wrapper, .lh-fraction__wrapper'))
      );
      assert.equal(scores.length, 14);

      await ensureNoErrors();
    });
  });

  describe('Renders the report', () => {
    before(async () => {
      await viewerPage.goto(viewerUrl, {waitUntil: 'networkidle2', timeout: 30000});
      const fileInput = await viewerPage.$('#hidden-file-input');
      await fileInput.uploadFile(sampleLhr);
      await viewerPage.waitForSelector('.lh-categories', {timeout: 30000});
    });

    it('should load with no errors', async () => {
      await ensureNoErrors();
    });

    it('should contain all categories', async () => {
      const categories = await getCategoryElementsIds();
      assert.deepStrictEqual(
        categories.sort(),
        lighthouseCategories.sort(),
        `all categories not found`
      );
    });

    it('should contain audits of all categories', async () => {
      const nonNavigationAudits = [
        'interaction-to-next-paint',
        'uses-responsive-images-snapshot',
        'work-during-interaction',
      ];
      for (const category of lighthouseCategories) {
        const expectedAuditIds = getAuditsOfCategory(category)
          .filter(a => a.group !== 'hidden' && !nonNavigationAudits.includes(a.id))
          .map(a => a.id);
        const elementIds = await getAuditElementsIds({category, selector: selectors.audits});

        assert.deepStrictEqual(
          elementIds.sort(),
          expectedAuditIds.sort(),
          `${category} does not have the identical audits`
        );
      }
    });

    it('should contain a filmstrip', async () => {
      const filmstrip = await viewerPage.$('.lh-filmstrip');

      assert.ok(!!filmstrip, `filmstrip is not available`);
    });

    it('should not have any unexpected audit errors', async () => {
      function getErrors(elems, selectors) {
        return elems.map(el => {
          const audit = el.closest(selectors.audits);
          const auditTitle = audit && audit.querySelector(selectors.titles);
          return {
            explanation: el.textContent,
            title: auditTitle ? auditTitle.textContent : 'Audit title unvailable',
          };
        });
      }

      const errorSelectors = '.lh-audit-explanation, .lh-tooltip--error';
      const auditErrors = await viewerPage.$$eval(errorSelectors, getErrors, selectors);
      const errors = auditErrors.filter(item => item.explanation.includes('Audit error:'));
      assert.deepStrictEqual(errors, [], 'Audit errors found within the report');
    });

    it('should support swapping locales', async () => {
      async function queryLocaleState() {
        await viewerPage.waitForSelector('.lh-locale-selector');
        return viewerPage.$$eval('.lh-locale-selector', (elems) => {
          const selectEl = elems[0];
          const optionEls = [...selectEl.querySelectorAll('option')];
          return {
            selectedValue: selectEl.value,
            options: optionEls.map(el => {
              return el.value;
            }),
            sampleString: document.querySelector('.lh-report-icon--copy').textContent,
          };
        });
      }

      const resultBeforeSwap = await queryLocaleState();
      expect(resultBeforeSwap.selectedValue).toBe('en-US');
      expect(resultBeforeSwap.options).toEqual(getCanonicalLocales());
      expect(resultBeforeSwap.sampleString).toBe('Copy JSON');

      await viewerPage.select('.lh-locale-selector', 'es');
      await viewerPage.waitForFunction(() => {
        return document.querySelector('.lh-report-icon--copy').textContent === 'Copiar JSON';
      });

      const resultAfterSwap = await queryLocaleState();
      expect(resultAfterSwap.selectedValue).toBe('es');
      expect(resultAfterSwap.sampleString).toBe('Copiar JSON');
    });

    it('should support saving as html', async () => {
      const tmpDir = `${LH_ROOT}/.tmp/pptr-downloads`;
      fs.rmSync(tmpDir, {force: true, recursive: true});
      const session = await viewerPage.target().createCDPSession();
      await session.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: tmpDir,
        eventsEnabled: true,
      });

      await viewerPage.click('.lh-tools__button');
      await viewerPage.waitForFunction(() => {
        return getComputedStyle(
          document.querySelector('.lh-tools__dropdown')).visibility === 'visible';
      });

      // For some reason, clicking this button doesn't always initiate the download after upgrading to Puppeteer 16.
      // As a workaround, we send another click signal 1s after the first to make sure the download starts.
      // TODO: Find a more robust fix for this issue.
      const timeoutHandle = setTimeout(() => viewerPage.click('a[data-action="save-html"]'), 1000);

      const [, filename] = await Promise.all([
        viewerPage.click('a[data-action="save-html"]'),
        new Promise(resolve => {
          session.on('Browser.downloadWillBegin', ({suggestedFilename}) => {
            resolve(suggestedFilename);
          });
        }),
        new Promise(resolve => {
          session.on('Browser.downloadProgress', ({state}) => {
            if (state === 'completed') resolve();
          });
        }),
      ]);

      clearTimeout(timeoutHandle);

      const savedPage = await browser.newPage();
      const savedPageErrors = [];
      savedPage.on('pageerror', e => savedPageErrors.push(e));
      const firstLogPromise =
        new Promise(resolve => savedPage.once('console', e => resolve(e.text())));
      await savedPage.goto(`file://${tmpDir}/${filename}`);
      expect(await firstLogPromise).toEqual('window.__LIGHTHOUSE_JSON__ JSHandle@object');
      if (savedPageErrors.length) {
        assert.fail('errors from page:\n\n' + savedPageErrors.map(e => e.toString()).join('\n\n'));
      }
    });
  });

  async function verifyLhrLoadsWithNoErrors(lhrFilePath) {
    await viewerPage.goto(viewerUrl, {waitUntil: 'networkidle2', timeout: 30000});
    const fileInput = await viewerPage.$('#hidden-file-input');
    const waitForAck = viewerPage.evaluate(() =>
      new Promise(resolve =>
        document.addEventListener('lh-file-upload-test-ack', resolve, {once: true})));
    await fileInput.uploadFile(lhrFilePath);
    await Promise.race([
      waitForAck,
      new Promise((resolve, reject) => setTimeout(reject, 5_000)),
    ]);
    // Give async work some time to happen (ex: SwapLocaleFeature.enable).
    await new Promise(resolve => setTimeout(resolve, 3_000));
    await ensureNoErrors();

    const content = await viewerPage.$eval('main', el => el.textContent);
    for (const line of content.split('\n')) {
      expect(line).not.toContain('undefined');
    }
  }

  describe('Renders old reports', () => {
    [
      'lhr-3.0.0.json',
      'lhr-4.3.0.json',
      'lhr-5.0.0.json',
      'lhr-6.0.0.json',
      'lhr-8.5.0.json',
      'lhr-9.6.8.json',
      'lhr-10.4.0.json',
      'lhr-11.7.0.json',
    ].forEach((testFilename) => {
      it(`[${testFilename}] should load with no errors`, async () => {
        await verifyLhrLoadsWithNoErrors(`${LH_ROOT}/report/test-assets/${testFilename}`);
      });
    });
  });

  describe('PSI', () => {
    itIfProtoExists('Renders proto roundtrip report', async () => {
      await verifyLhrLoadsWithNoErrors(`${LH_ROOT}/.tmp/sample_v2_round_trip.json`);
    });

    /** @type {Partial<puppeteer.ResponseForRequest>} */
    let interceptedRequest;
    /** @type {Partial<puppeteer.ResponseForRequest>} */
    let psiResponse;

    const sampleLhrJson = JSON.parse(fs.readFileSync(sampleLhr, 'utf-8'));
    /** @type {Partial<puppeteer.ResponseForRequest>} */
    const goodPsiResponse = {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({lighthouseResult: sampleLhrJson}),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
    /** @type {Partial<puppeteer.ResponseForRequest>} */
    const badPsiResponse = {
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({error: {message: 'badPsiResponse error'}}),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };

    /**
     * Sniffs just the request made to the PSI API. All other requests
     * fall through.
     * To set the mocked PSI response, assign `psiResponse`.
     * To read the intercepted request, use `interceptedRequest`.
     * @param {import('puppeteer').HTTPRequest} request
     */
    function onRequest(request) {
      if (request.url().includes('https://www.googleapis.com')) {
        interceptedRequest = request;
        request.respond(psiResponse);
      } else {
        request.continue();
      }
    }

    before(async () => {
      await viewerPage.setRequestInterception(true);
      viewerPage.on('request', onRequest);
    });

    after(async () => {
      viewerPage.off('request', onRequest);
      await viewerPage.setRequestInterception(false);
    });

    beforeEach(() => {
      interceptedRequest = undefined;
      psiResponse = undefined;
    });

    it('should call out to PSI with all categories by default', async () => {
      psiResponse = goodPsiResponse;

      const url = `${viewerUrl}?psiurl=https://www.example.com`;
      await viewerPage.goto(url);

      // Wait for report to render.
      await viewerPage.waitForSelector('.lh-metrics-container', {timeout: 5000});

      const interceptedUrl = new URL(interceptedRequest.url());
      expect(interceptedUrl.origin + interceptedUrl.pathname)
        .toEqual('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');

      const params = {
        key: interceptedUrl.searchParams.get('key'),
        url: interceptedUrl.searchParams.get('url'),
        category: interceptedUrl.searchParams.getAll('category'),
        strategy: interceptedUrl.searchParams.get('strategy'),
        locale: interceptedUrl.searchParams.get('locale'),
        utm_source: interceptedUrl.searchParams.get('utm_source'),
      };
      expect(params).toEqual({
        key: 'AIzaSyAjcDRNN9CX9dCazhqI4lGR7yyQbkd_oYE',
        url: 'https://www.example.com',
        // Order in the api call is important to PSI!
        category: [
          'performance',
          'accessibility',
          'seo',
          'best-practices',
        ],
        strategy: 'mobile',
        // These values aren't set by default.
        locale: null,
        utm_source: null,
      });

      // Confirm that all default categories are used.
      const defaultCategories = Object.keys(defaultConfig.categories).sort();
      expect(interceptedUrl.searchParams.getAll('category').sort()).toEqual(defaultCategories);

      // No errors.
      await ensureNoErrors();

      // All categories.
      const categoryElementIds = await getCategoryElementsIds();
      assert.deepStrictEqual(
        categoryElementIds.sort(),
        lighthouseCategories.sort(),
        `all categories not found`
      );

      // Should not clear the query string.
      expect(await viewerPage.url()).toEqual(url);
    });

    it('should call out to PSI with specified categories', async () => {
      psiResponse = goodPsiResponse;

      const url = `${viewerUrl}?psiurl=https://www.example.com&category=seo&category=accessibility&utm_source=utm&locale=es`;
      await viewerPage.goto(url);

      // Wait for report to render.call out to PSI with specified categories
      await viewerPage.waitForSelector('.lh-metrics-container');

      const interceptedUrl = new URL(interceptedRequest.url());
      expect(interceptedUrl.origin + interceptedUrl.pathname)
        .toEqual('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');

      const params = {
        url: interceptedUrl.searchParams.get('url'),
        category: interceptedUrl.searchParams.getAll('category'),
        locale: interceptedUrl.searchParams.get('locale'),
        utm_source: interceptedUrl.searchParams.get('utm_source'),
      };
      expect(params).toEqual({
        url: 'https://www.example.com',
        category: [
          'seo',
          'accessibility',
        ],
        locale: 'es',
        utm_source: 'utm',
      });

      // No errors.
      await ensureNoErrors();
    });

    it('should handle errors from the API', async () => {
      psiResponse = badPsiResponse;

      const url = `${viewerUrl}?psiurl=https://www.example.com`;
      await viewerPage.goto(url);

      // Wait for error.
      const errorEl = await viewerPage.waitForSelector('#lh-log.lh-show');
      const errorMessage = await viewerPage.evaluate(errorEl => errorEl.textContent, errorEl);
      expect(errorMessage).toBe('badPsiResponse error');

      // Expected errors.
      const errors = await claimErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('500 (Internal Server Error)');
      expect(errors[1]).toContain('badPsiResponse error');
    });
  });
});
