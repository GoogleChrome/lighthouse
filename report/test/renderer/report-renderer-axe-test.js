/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import puppeteer from 'puppeteer';

import {ReportGenerator} from '../../generator/report-generator.js';
import {axeSource} from '../../../core/lib/axe.js';
import {readJson} from '../../../core/test/test-utils.js';

const sampleResults = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('ReportRendererAxe', () => {
  describe('with aXe', () => {
    let browser;

    before(async () => {
      browser = await puppeteer.launch();
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

      expect(axeResults.violations.find(v => v.id === 'duplicate-id')).toMatchObject({
        id: 'duplicate-id',
        nodes: [
          // We use these audits in multiple categories. Makes sense.
          {html: '<div class="lh-audit lh-audit--binary lh-audit--pass" id="viewport">'},
          {html: '<div class="lh-audit lh-audit--binary lh-audit--fail" id="image-alt">'},
          {html: '<div class="lh-audit lh-audit--binary lh-audit--pass" id="document-title">'},
          {html: '<div class="lh-audit lh-audit--notapplicable lh-audit--pass" id="redirects-http">'}, // eslint-disable-line max-len
        ],
      });

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
