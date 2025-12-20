/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest, browser */

const assert = require('assert').strict;
const fs = require('fs');
const jsdom = require('jsdom');
const Util = require('../../../../report/html/renderer/util.js');
const I18n = require('../../../../report/html/renderer/i18n.js');
const URL = require('../../../../lib/url-shim.js');
const DOM = require('../../../../report/html/renderer/dom.js');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer.js');
const CriticalRequestChainRenderer = require(
    '../../../../report/html/renderer/crc-details-renderer.js');
const CategoryRenderer = require('../../../../report/html/renderer/category-renderer.js');
const sampleResultsOrig = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');

describe('PerfCategoryRenderer', () => {
  let category;
  let renderer;
  let sampleResults;

  beforeAll(() => {
    global.Util = Util;
    global.Util.i18n = new I18n('en', {...Util.UIStrings});
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;
    global.CategoryRenderer = CategoryRenderer;

    const PerformanceCategoryRenderer =
        require('../../../../report/html/renderer/performance-category-renderer.js');

    const {document} = new jsdom.JSDOM(TEMPLATE_FILE).window;
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new PerformanceCategoryRenderer(dom, detailsRenderer);

    // TODO: don't call a LH.ReportResult `sampleResults`, which is typically always LH.Result
    sampleResults = Util.prepareReportResult(sampleResultsOrig);
    category = sampleResults.categories.performance;
  });

  afterAll(() => {
    global.Util.i18n = undefined;
    global.Util = undefined;
    global.CriticalRequestChainRenderer = undefined;
    global.CategoryRenderer = undefined;
  });

  it('renders the category header', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const score = categoryDOM.querySelector('.lh-category-header');
    const value = categoryDOM.querySelector('.lh-category-header  .lh-gauge__percentage');
    const title = score.querySelector('.lh-gauge__label');

    assert.deepEqual(score, score.firstElementChild, 'first child is a score');
    const scoreInDom = Number(value.textContent);
    assert.ok(Number.isInteger(scoreInDom) && scoreInDom > 10, 'category score is rounded');
    assert.equal(title.textContent, category.title, 'title is set');
  });

  it('renders the sections', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const sections = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group');
    assert.equal(sections.length, 5);
  });

  it('renders the metrics', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const metricsSection = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group')[0];

    const metricAudits = category.auditRefs.filter(audit => audit.group === 'metrics');
    const timelineElements = metricsSection.querySelectorAll('.lh-metric');
    const nontimelineElements = metricsSection.querySelectorAll('.lh-audit');
    assert.equal(timelineElements.length + nontimelineElements.length, metricAudits.length);
  });

  it('renders the metrics variance disclaimer as markdown', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const disclaimerEl =
        categoryDOM.querySelector('.lh-audit-group--metrics > .lh-metrics__disclaimer');

    assert.ok(disclaimerEl.textContent.includes('Values are estimated'));
    const disclamerLink = disclaimerEl.querySelector('a');
    assert.ok(disclamerLink, 'disclaimer contains coverted markdown link');
    const disclamerUrl = new URL(disclamerLink.href);
    assert.strictEqual(disclamerUrl.hostname, 'web.dev');
    const calcLink = disclaimerEl.querySelector('a.lh-calclink');
    assert.ok(calcLink, 'disclaimer contains scorecalc link');
    assert.strictEqual(new URL(calcLink.href).hostname, 'googlechrome.github.io');
  });

  it('renders the failing performance opportunities', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

    const oppAudits = category.auditRefs.filter(audit => audit.group === 'load-opportunities' &&
        audit.result.score !== 1);
    const oppElements = categoryDOM.querySelectorAll('.lh-audit--load-opportunity');
    assert.equal(oppElements.length, oppAudits.length);

    const oppElement = oppElements[0];
    const oppSparklineBarElement = oppElement.querySelector('.lh-sparkline__bar');
    const oppSparklineElement = oppElement.querySelector('.lh-load-opportunity__sparkline');
    const oppTitleElement = oppElement.querySelector('.lh-audit__title');
    const oppWastedElement = oppElement.querySelector('.lh-audit__display-text');
    assert.ok(oppTitleElement.textContent, 'did not render title');
    assert.ok(oppSparklineBarElement.style.width, 'did not set sparkline width');
    assert.ok(oppWastedElement.textContent, 'did not render stats');
    assert.ok(oppSparklineElement.title, 'did not set tooltip on sparkline');
  });

  it('renders performance opportunities with an errorMessage', () => {
    const auditWithError = {
      score: 0,
      group: 'load-opportunities',
      result: {
        score: null, scoreDisplayMode: 'error', errorMessage: 'Yikes!!', title: 'Bug #2',
        description: '',
      },
    };

    const fakeCategory = Object.assign({}, category, {auditRefs: [auditWithError]});
    const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);
    const tooltipEl = categoryDOM.querySelector('.lh-audit--load-opportunity .tooltip--error');
    assert.ok(tooltipEl, 'did not render error message');
    assert.ok(/Yikes!!/.test(tooltipEl.textContent));
  });

  it('renders performance opportunities\' explanation', () => {
    const auditWithExplanation = {
      score: 0,
      group: 'load-opportunities',
      result: {
        score: 0, scoreDisplayMode: 'numeric',
        numericValue: 100, explanation: 'Yikes!!', title: 'Bug #2', description: '',
      },
    };

    const fakeCategory = Object.assign({}, category, {auditRefs: [auditWithExplanation]});
    const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);

    const selector = '.lh-audit--load-opportunity .lh-audit-explanation';
    const tooltipEl = categoryDOM.querySelector(selector);
    assert.ok(tooltipEl, 'did not render explanation text');
    assert.ok(/Yikes!!/.test(tooltipEl.textContent));
  });

  it('renders the failing diagnostics', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const diagnosticSection = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group')[3];

    const diagnosticAudits = category.auditRefs.filter(audit => audit.group === 'diagnostics' &&
        !Util.showAsPassed(audit.result));
    const diagnosticElements = diagnosticSection.querySelectorAll('.lh-audit');
    assert.equal(diagnosticElements.length, diagnosticAudits.length);
  });

  it('renders the passed audits', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const passedSection = categoryDOM.querySelector('.lh-category > .lh-clump--passed');

    const passedAudits = category.auditRefs.filter(audit =>
      audit.group && audit.group !== 'metrics' && audit.id !== 'performance-budget'
        && Util.showAsPassed(audit.result));
    const passedElements = passedSection.querySelectorAll('.lh-audit');
    assert.equal(passedElements.length, passedAudits.length);
  });

  // Unsupported by perf cat renderer right now.
  it.skip('renders any manual audits', () => {
  });

  describe('getWastedMs', () => {
    it('handles erroring opportunities', () => {
      const auditWithDebug = {
        score: 0,
        group: 'load-opportunities',
        result: {
          error: true, score: 0,
          numericValue: 100, explanation: 'Yikes!!', title: 'Bug #2',
        },
      };
      const wastedMs = renderer._getWastedMs(auditWithDebug);
      assert.ok(Number.isFinite(wastedMs), 'Finite number not returned by wastedMs');
    });
  });

  describe('budgets', () => {
    it('renders the group and header', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

      const budgetsGroup = categoryDOM.querySelector('.lh-audit-group.lh-audit-group--budgets');
      assert.ok(budgetsGroup);

      const header = budgetsGroup.querySelector('.lh-audit-group__header');
      assert.ok(header);
    });

    it('renders the performance budget table', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const budgetTable = categoryDOM.querySelector('#performance-budget.lh-table');
      assert.ok(budgetTable);

      const lhrBudgetEntries = sampleResults.audits['performance-budget'].details.items;
      const tableRows = budgetTable.querySelectorAll('tbody > tr');
      assert.strictEqual(tableRows.length, lhrBudgetEntries.length);
    });

    it('renders the timing budget table', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const budgetTable = categoryDOM.querySelector('#timing-budget.lh-table');
      assert.ok(budgetTable);

      const lhrBudgetEntries = sampleResults.audits['timing-budget'].details.items;
      const tableRows = budgetTable.querySelectorAll('tbody > tr');
      assert.strictEqual(tableRows.length, lhrBudgetEntries.length);
    });

    it('does not render the budgets section when all budget audits are notApplicable', () => {
      const budgetlessCategory = JSON.parse(JSON.stringify(category));
      ['performance-budget', 'timing-budget'].forEach((id) => {
        const budgetRef = budgetlessCategory.auditRefs.find(a => a.id === id);
        budgetRef.result.scoreDisplayMode = 'notApplicable';
        delete budgetRef.result.details;
      });

      const categoryDOM = renderer.render(budgetlessCategory, sampleResults.categoryGroups);
      const budgetsGroup = categoryDOM.querySelector('.lh-audit-group.lh-audit-group--budgets');
      assert.strictEqual(budgetsGroup, null);
    });
  });

  describe('_getScoringCalculatorHref', () => {
    it('creates a working link given some auditRefs', () => {
      const categoryClone = JSON.parse(JSON.stringify(category));

      // CLS of 0 is both valid and falsy. Make sure it doesn't become 'null'
      const cls = categoryClone.auditRefs.find(audit => audit.id === 'cumulative-layout-shift');
      cls.result.numericValue = 0;

      const href = renderer._getScoringCalculatorHref(categoryClone.auditRefs);
      const url = new URL(href);
      expect(url.hash.split('&')).toMatchInlineSnapshot(`
        Array [
          "#first-contentful-paint=3969.135",
          "speed-index=4417",
          "largest-contentful-paint=4927.278",
          "interactive=4927.278",
          "total-blocking-time=116.79800000000023",
          "cumulative-layout-shift=0",
          "first-cpu-idle=4927.278",
          "first-meaningful-paint=3969.136",
        ]
      `);
    });

    it('also appends device and version number', () => {
      Util.reportJson = {
        configSettings: {emulatedFormFactor: 'mobile'},
        lighthouseVersion: '6.0.0',
      };
      const href = renderer._getScoringCalculatorHref(category.auditRefs);
      const url = new URL(href);
      try {
        expect(url.hash.split('&')).toMatchInlineSnapshot(`
          Array [
            "#first-contentful-paint=3969.135",
            "speed-index=4417",
            "largest-contentful-paint=4927.278",
            "interactive=4927.278",
            "total-blocking-time=116.79800000000023",
            "cumulative-layout-shift=0.42",
            "first-cpu-idle=4927.278",
            "first-meaningful-paint=3969.136",
            "device=mobile",
            "version=6.0.0",
          ]
        `);
      } finally {
        Util.reportJson = null;
      }
    });

    it('uses null if the metric is missing its value', () => {
      const categoryClone = JSON.parse(JSON.stringify(category));
      const lcp = categoryClone.auditRefs.find(audit => audit.id === 'largest-contentful-paint');
      lcp.result.numericValue = undefined;
      lcp.result.score = null;
      const href = renderer._getScoringCalculatorHref(categoryClone.auditRefs);
      expect(href).toContain('largest-contentful-paint=null');
    });
  });

  // This is done all in CSS, but tested here.
  describe('metric description toggles', () => {
    let container;
    let toggle;
    const metricsSelector = '.lh-audit-group--metrics';
    const toggleSelector = '.lh-metrics-toggle__input';
    const magicSelector =
      '.lh-metrics-toggle__input:checked ~ .lh-metrics-container .lh-metric__description';
    let getDescriptionsAfterCheckedToggle;

    describe('works if there is a performance category', () => {
      beforeAll(() => {
        container = renderer.render(category, sampleResults.categoryGroups);
        const metricsAuditGroup = container.querySelector(metricsSelector);
        toggle = metricsAuditGroup.querySelector(toggleSelector);
        // In the CSS, our magicSelector will flip display from `none` to `block`
        getDescriptionsAfterCheckedToggle = _ => metricsAuditGroup.querySelectorAll(magicSelector);
      });

      it('descriptions hidden by default', () => {
        assert.ok(getDescriptionsAfterCheckedToggle().length === 0);
      });

      it('can toggle description visibility', () => {
        assert.ok(getDescriptionsAfterCheckedToggle().length === 0);
        toggle.click();
        assert.ok(getDescriptionsAfterCheckedToggle().length > 2);
        toggle.click();
        assert.ok(getDescriptionsAfterCheckedToggle().length === 0);
      });
    });
  });
});
