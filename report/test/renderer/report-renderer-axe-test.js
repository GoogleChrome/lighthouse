/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer';
import {getChromePath} from 'chrome-launcher';

import {ReportGenerator} from '../../generator/report-generator.js';
import {axeSource} from '../../../core/lib/axe.js';
import {readJson} from '../../../core/test/test-utils.js';

const sampleResults = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('ReportRendererAxe', () => {
  describe('with aXe', () => {
    let browser;

    before(async () => {
      browser = await puppeteer.launch({
        executablePath: getChromePath(),
      });
    });

    after(async () => {
      await browser.close();
    });

    // This test takes 10s on fast hardware, but can take longer in CI.
    // https://github.com/dequelabs/axe-core/tree/b573b1c1/doc/examples/jest_react#timeout-issues
    it('renders without axe violations', async () => {
      const page = await browser.newPage();
      const htmlReport = ReportGenerator.generateReportHtml(sampleResults);
      await page.setContent(htmlReport);

      // Superset of Lighthouse's aXe config
      const config = {
        runOnly: {
          type: 'tag',
          values: [
            'wcag2a',
            'wcag2aa',
          ],
        },
        resultTypes: ['violations', 'inapplicable'],
        rules: {
          'tabindex': {enabled: true},
          'accesskeys': {enabled: true},
          'heading-order': {enabled: true},
          'meta-viewport': {enabled: true},
          'aria-treeitem-name': {enabled: true},
          // TODO: re-enable. https://github.com/GoogleChrome/lighthouse/issues/13918
          'color-contrast': {enabled: false},
        },
      };

      await page.evaluate(axeSource);
      // eslint-disable-next-line no-undef
      const axeResults = await page.evaluate(config => axe.run(config), config);

      // Color contrast failure only pops up if this pptr is run headfully.
      // There are currently 27 problematic nodes, primarily audit display text and explanations.
      // TODO: fix these failures, regardless.
      // {
      //   id: 'color-contrast',
      // },

      const axeSummary = axeResults.violations.map((v) => {
        return {
          id: v.id,
          message: v.nodes.map((n) => n.failureSummary).join('\n'),
        };
      });
      expect(axeSummary).toMatchSnapshot();
    });
  });
});
