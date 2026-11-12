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
import AxeAudit from '../../../core/audits/accessibility/axe-audit.js';
import {Audit} from '../../../core/audits/audit.js';
import * as format from '../../../shared/localization/format.js';

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

    it('shows manual review in the collapsed audit summary', async () => {
      class ExampleAudit extends AxeAudit {
        static get meta() {
          return {id: 'color-contrast', title: 'Example contrast audit', description: 'Example',
            requiredArtifacts: ['Accessibility']};
        }
      }
      const node = {node: {selector: '#review', snippet: '<div id="review">Text</div>'},
        relatedNodes: []};
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      const ref = lhr.categories.accessibility.auditRefs.find(item => item.id === 'color-contrast');
      const page = await browser.newPage();
      try {
        for (const violations of [[], [{id: 'color-contrast', nodes: [node]}]]) {
          const product = ExampleAudit.audit({Accessibility: {
            violations, incomplete: [{id: 'color-contrast', nodes: [node]}],
          }});
          const result = Audit.generateAuditResult(ExampleAudit, product);
          format.replaceIcuMessages(result, 'en-US');
          lhr.audits['color-contrast'] = result;
          ref.weight = violations.length ? 1 : 0;
          await page.setContent(ReportGenerator.generateReportHtml(lhr));
          const audit = await page.waitForSelector('#color-contrast');
          const state = await audit.evaluate(el => {
            const details = el.querySelector('details');
            const label = el.querySelector('.lh-audit__display-text');
            const rect = label.getBoundingClientRect();
            return {
              open: details.open, text: label.textContent, visible: !!(rect.width && rect.height),
            };
          });
          expect(state).toEqual({open: false, text: 'Needs manual review', visible: true});
        }
      } finally {
        await page.close();
      }
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
