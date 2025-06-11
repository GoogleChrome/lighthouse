/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer, {Browser, Page} from 'puppeteer';
import {getChromePath} from 'chrome-launcher';

import {ReportGenerator} from '../../report/generator/report-generator.js';
import {swapFlowLocale} from '../../shared/localization/swap-flow-locale.js';
import {flowResult} from './sample-flow';

describe('Lighthouse Flow Report', () => {
  console.log('\n✨ Be sure to have recently run this: yarn build-report');

  let browser: Browser;
  let page: Page;
  const pageErrors: Error[] = [];

  before(async () => {
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
    });
    page = await browser.newPage();
    page.on('pageerror', pageError => pageErrors.push(pageError));
  });

  after(async () => {
    if (pageErrors.length > 0) console.error(pageErrors);

    await browser.close();
  });

  describe('Renders the flow report', () => {
    before(async () => {
      const html = ReportGenerator.generateFlowReportHtml(flowResult);
      await page.setContent(html);
    });

    it('should load with no errors', async () => {
      expect(pageErrors).toHaveLength(0);
    });
  });

  describe('Renders the flow report (i18n)', () => {
    before(async () => {
      const html = ReportGenerator.generateFlowReportHtml(swapFlowLocale(flowResult, 'es'));
      await page.setContent(html);
    });

    it('should load with no errors', async () => {
      expect(pageErrors).toHaveLength(0);
      const el = await page.$('.SummarySectionHeader__content');
      if (!el) throw new Error();
      const text = await el.evaluate(el => el.textContent);
      expect(text).toEqual('Todos los informes');
    });
  });
}).timeout(35_000);
