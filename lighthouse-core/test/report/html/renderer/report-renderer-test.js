/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const fs = require('fs');
const jsdom = require('jsdom');
const Util = require('../../../../report/html/renderer/util.js');
const I18n = require('../../../../report/html/renderer/i18n.js');
const URL = require('../../../../lib/url-shim.js');
const DOM = require('../../../../report/html/renderer/dom.js');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer.js');
const ReportUIFeatures = require('../../../../report/html/renderer/report-ui-features.js');
const CategoryRenderer = require('../../../../report/html/renderer/category-renderer.js');
const ElementScreenshotRenderer =
  require('../../../../report/html/renderer/element-screenshot-renderer.js');
const CriticalRequestChainRenderer = require(
    '../../../../report/html/renderer/crc-details-renderer.js');
const ReportRenderer = require('../../../../report/html/renderer/report-renderer.js');
const sampleResultsOrig = require('../../../results/sample_v2.json');

const TIMESTAMP_REGEX = /\d+, \d{4}.*\d+:\d+/;
const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');

describe('ReportRenderer', () => {
  let renderer;
  let sampleResults;

  beforeAll(() => {
    global.Util = Util;
    global.I18n = I18n;
    global.ReportUIFeatures = ReportUIFeatures;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;
    global.DetailsRenderer = DetailsRenderer;
    global.CategoryRenderer = CategoryRenderer;
    global.ElementScreenshotRenderer = ElementScreenshotRenderer;

    // lazy loaded because they depend on CategoryRenderer to be available globally
    global.PerformanceCategoryRenderer =
        require('../../../../report/html/renderer/performance-category-renderer.js');
    global.PwaCategoryRenderer =
        require('../../../../report/html/renderer/pwa-category-renderer.js');

    // Stub out matchMedia for Node.
    global.matchMedia = function() {
      return {
        addListener: function() {},
      };
    };

    const {window} = new jsdom.JSDOM(TEMPLATE_FILE);
    global.self = window;

    const dom = new DOM(window.document);
    const detailsRenderer = new DetailsRenderer(dom);
    const categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    renderer = new ReportRenderer(dom, categoryRenderer);
    sampleResults = Util.prepareReportResult(sampleResultsOrig);
  });

  afterAll(() => {
    global.self = undefined;
    global.Util = undefined;
    global.I18n = undefined;
    global.ReportUIFeatures = undefined;
    global.matchMedia = undefined;
    global.CriticalRequestChainRenderer = undefined;
    global.DetailsRenderer = undefined;
    global.CategoryRenderer = undefined;
    global.ElementScreenshotRenderer = undefined;
    global.PerformanceCategoryRenderer = undefined;
    global.PwaCategoryRenderer = undefined;
  });

  describe('renderReport', () => {
    it('should render a report', () => {
      const container = renderer._dom._document.body;
      const output = renderer.renderReport(sampleResults, container);
      assert.ok(output.querySelector('.lh-header-container'), 'has a header');
      assert.ok(output.querySelector('.lh-report'), 'has report body');
      // 3 sets of gauges - one in sticky header, one in scores header, and one in each section.
      assert.equal(output.querySelectorAll('.lh-gauge__wrapper, .lh-gauge--pwa__wrapper').length,
          Object.keys(sampleResults.categories).length * 3, 'renders category gauges');
    });

    it('renders additional reports by replacing the existing one', () => {
      const container = renderer._dom._document.body;
      const oldReport = Array.from(renderer.renderReport(sampleResults, container).children);
      const newReport = Array.from(renderer.renderReport(sampleResults, container).children);
      assert.ok(!oldReport.find(node => container.contains(node)), 'old report was removed');
      assert.ok(newReport.find(node => container.contains(node)),
        'new report appended to container');
    });

    it('renders a topbar', () => {
      const topbar = renderer._renderReportTopbar(sampleResults);
      assert.equal(topbar.querySelector('.lh-topbar__url').textContent, sampleResults.finalUrl);
    });

    it('renders a header', () => {
      const header = renderer._renderReportHeader();
      assert.ok(header.querySelector('.lh-scores-container'), 'contains score container');
    });

    it('renders score gauges in this order: default, pwa, plugins', () => {
      const sampleResultsCopy = JSON.parse(JSON.stringify(sampleResults));
      sampleResultsCopy.categories['lighthouse-plugin-someplugin'] = {
        id: 'lighthouse-plugin-someplugin',
        title: 'Some Plugin',
        auditRefs: [],
      };

      const container = renderer._dom._document.body;
      const output = renderer.renderReport(sampleResultsCopy, container);

      function isPWAGauge(el) {
        return el.querySelector('.lh-gauge__label').textContent === 'Progressive Web App';
      }
      function isPluginGauge(el) {
        return el.querySelector('.lh-gauge__label').textContent === 'Some Plugin';
      }

      const indexOfPwaGauge = Array.from(output
        .querySelectorAll('.lh-scores-header > a[class*="lh-gauge"]')).findIndex(isPWAGauge);

      const indexOfPluginGauge = Array.from(output
        .querySelectorAll('.lh-scores-header > a[class*="lh-gauge"]')).findIndex(isPluginGauge);

      const scoresHeaderElem = output.querySelector('.lh-scores-header');
      assert.equal(scoresHeaderElem.children.length - 2, indexOfPwaGauge);
      assert.equal(scoresHeaderElem.children.length - 1, indexOfPluginGauge);
      assert(indexOfPluginGauge > indexOfPwaGauge);

      for (let i = 0; i < scoresHeaderElem.children.length; i++) {
        const gauge = scoresHeaderElem.children[i];

        assert.ok(gauge.classList.contains('lh-gauge__wrapper'));
        if (i >= indexOfPluginGauge) {
          assert.ok(isPluginGauge(gauge));
        } else if (i >= indexOfPwaGauge) {
          assert.ok(isPWAGauge(gauge));
        }
      }
    });

    it('renders plugin score gauge', () => {
      const sampleResultsCopy = JSON.parse(JSON.stringify(sampleResults));
      sampleResultsCopy.categories['lighthouse-plugin-someplugin'] = {
        id: 'lighthouse-plugin-someplugin',
        title: 'Some Plugin',
        auditRefs: [],
      };
      const container = renderer._dom._document.body;
      const output = renderer.renderReport(sampleResultsCopy, container);
      const scoresHeaderElem = output.querySelector('.lh-scores-header');

      const gaugeCount = scoresHeaderElem.querySelectorAll('.lh-gauge').length;
      const pluginGaugeCount =
        scoresHeaderElem.querySelectorAll('.lh-gauge__wrapper--plugin').length;

      // 5 core categories + the 1 plugin.
      assert.equal(6, gaugeCount);
      assert.equal(1, pluginGaugeCount);
    });

    it('should not mutate a report object', () => {
      const container = renderer._dom._document.body;
      const originalResults = JSON.parse(JSON.stringify(sampleResults));
      renderer.renderReport(sampleResults, container);
      assert.deepStrictEqual(sampleResults, originalResults);
    }, 2000);

    it('renders no warning section when no lighthouseRunWarnings occur', () => {
      const warningResults = Object.assign({}, sampleResults, {runWarnings: []});
      const container = renderer._dom._document.body;
      const output = renderer.renderReport(warningResults, container);
      assert.strictEqual(output.querySelector('.lh-warnings--toplevel'), null);
    });

    it('renders a warning section', () => {
      const container = renderer._dom._document.body;
      const output = renderer.renderReport(sampleResults, container);

      const warningEls = output.querySelectorAll('.lh-warnings--toplevel > ul > li');
      assert.strictEqual(warningEls.length, sampleResults.runWarnings.length);
    });

    it('renders links in the warning section', () => {
      const warningResults = Object.assign({}, sampleResults, {
        runWarnings: ['[I am a link](https://example.com/)'],
      });
      const container = renderer._dom._document.body;
      const output = renderer.renderReport(warningResults, container);

      const warningEls = output.querySelectorAll('.lh-warnings--toplevel ul li a');
      expect(warningEls).toHaveLength(1);
      expect(warningEls[0].href).toEqual('https://example.com/');
    });

    it('renders a footer', () => {
      const footer = renderer._renderReportFooter(sampleResults);
      const footerContent = footer.querySelector('.lh-footer').textContent;
      assert.ok(/Generated by Lighthouse \d/.test(footerContent), 'includes lh version');
      assert.ok(footerContent.match(TIMESTAMP_REGEX), 'includes timestamp');

      // Check runtime settings were populated.
      const names = Array.from(footer.querySelectorAll('.lh-env__name'));
      const descriptions = Array.from(footer.querySelectorAll('.lh-env__description'));
      assert.ok(names.length >= 3);
      assert.ok(descriptions.length >= 3);

      const descriptionsTxt = descriptions.map(el => el.textContent).join('\n');
      expect(descriptionsTxt).toContain('Moto G4');
      expect(descriptionsTxt).toContain('RTT');
      expect(descriptionsTxt).toMatch(/\dx/);
      expect(descriptionsTxt).toContain(sampleResults.userAgent);
    });
  });

  it('can set a custom templateContext', () => {
    assert.equal(renderer._templateContext, renderer._dom.document());

    const {window} = new jsdom.JSDOM(TEMPLATE_FILE);
    const otherDocument = window.document;
    renderer.setTemplateContext(otherDocument);
    assert.equal(renderer._templateContext, otherDocument);
  });

  it('should add LHR channel to doc link parameters', () => {
    const lhrChannel = sampleResults.configSettings.channel;
    // Make sure we have a channel in the LHR.
    assert.ok(lhrChannel.length > 2);

    const container = renderer._dom._document.body;
    const output = renderer.renderReport(sampleResults, container);

    const DOCS_ORIGINS = ['https://developers.google.com', 'https://web.dev'];
    const utmChannels = [...output.querySelectorAll('a[href*="utm_source=lighthouse"')]
      .map(a => new URL(a.href))
      .filter(url => DOCS_ORIGINS.includes(url.origin))
      .map(url => url.searchParams.get('utm_medium'));

    assert.ok(utmChannels.length > 100);
    for (const utmChannel of utmChannels) {
      assert.strictEqual(utmChannel, lhrChannel);
    }
  });

  it('renders `not_applicable` audits as `notApplicable`', () => {
    const clonedSampleResult = JSON.parse(JSON.stringify(sampleResultsOrig));

    let notApplicableCount = 0;
    Object.values(clonedSampleResult.audits).forEach(audit => {
      // The performance-budget audit is omitted from the DOM when it is not applicable
      if (audit.scoreDisplayMode === 'notApplicable' && audit.id !== 'performance-budget') {
        notApplicableCount++;
        audit.scoreDisplayMode = 'not_applicable';
      }
    });

    assert.ok(notApplicableCount > 20); // Make sure something's being tested.

    const container = renderer._dom._document.body;
    const reportElement = renderer.renderReport(sampleResults, container);
    const notApplicableElementCount = reportElement
      .querySelectorAll('.lh-audit--notapplicable').length;
    assert.strictEqual(notApplicableCount, notApplicableElementCount);
  });

  describe('axe-core', () => {
    let axe;

    beforeAll(() =>{
      // Needed by axe-core
      // https://github.com/dequelabs/axe-core/blob/581c441c/doc/examples/jsdom/test/a11y.js#L24
      global.window = global.self;
      global.Node = global.self.Node;
      global.Element = global.self.Element;

      // axe-core must be required after the global polyfills
      axe = require('axe-core');
    });

    afterAll(() => {
      global.window = undefined;
      global.Node = undefined;
      global.Element = undefined;
    });

    it('renders without axe violations', () => {
      const container = renderer._dom._document.createElement('main');
      const output = renderer.renderReport(sampleResults, container);
      renderer._dom._document.body.appendChild(container);

      const config = {
        rules: {
          // Reports may have duplicate ids
          // https://github.com/GoogleChrome/lighthouse/issues/9432
          'duplicate-id': {enabled: false},
          'duplicate-id-aria': {enabled: false},
          'landmark-no-duplicate-contentinfo': {enabled: false},
          // The following rules are disable for axe-core + jsdom compatibility
          // https://github.com/dequelabs/axe-core/tree/b573b1c1/doc/examples/jest_react#to-run-the-example
          'color-contrast': {enabled: false},
          'link-in-text-block': {enabled: false},
          // Report has empty links prior to i18n-ing.
          'link-name': {enabled: false},
          // May not be a real issue. https://github.com/dequelabs/axe-core/issues/2958
          'nested-interactive': {enabled: false},
        },
      };

      return new Promise(resolve => {
        axe.run(output, config, (error, {violations}) => {
          expect(error).toBeNull();
          expect(violations).toEqual([]);
          resolve();
        });
      });
    // Set timeout to 10s to give axe-core enough time to complete
    // https://github.com/dequelabs/axe-core/tree/b573b1c1/doc/examples/jest_react#timeout-issues
    }, /* timeout= */ 10 * 1000);
  });
});
