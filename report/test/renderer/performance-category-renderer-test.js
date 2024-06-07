/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import jsdom from 'jsdom';

import {ReportUtils} from '../../renderer/report-utils.js';
import {I18nFormatter} from '../../renderer/i18n-formatter.js';
import {DOM} from '../../renderer/dom.js';
import {DetailsRenderer} from '../../renderer/details-renderer.js';
import {PerformanceCategoryRenderer} from '../../renderer/performance-category-renderer.js';
import {readJson} from '../../../core/test/test-utils.js';
import {Globals} from '../../renderer/report-globals.js';

const sampleResultsOrig = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('PerfCategoryRenderer', () => {
  let category;
  let renderer;
  let sampleResults;

  before(() => {
    Globals.apply({
      providedStrings: {},
      i18n: new I18nFormatter('en'),
      reportJson: null,
    });

    const window = new jsdom.JSDOM().window;
    const document = window.document;
    global.HTMLElement = window.HTMLElement;

    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new PerformanceCategoryRenderer(dom, detailsRenderer);

    // TODO: don't call a LH.ReportResult `sampleResults`, which is typically always LH.Result
    sampleResults = ReportUtils.prepareReportResult(sampleResultsOrig);
    category = sampleResults.categories.performance;
  });

  after(() => {
    Globals.i18n = undefined;
  });

  it('renders the category header', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const score = categoryDOM.querySelector('.lh-category-header');
    const value = categoryDOM.querySelector('.lh-category-header .lh-exp-gauge__percentage');
    const title = score.querySelector('.lh-exp-gauge__label');

    assert.deepEqual(score, score.firstElementChild, 'first child is a score');
    const scoreInDom = Number(value.textContent);
    assert.ok(Number.isInteger(scoreInDom) && scoreInDom > 10, 'category score is rounded');
    assert.equal(title.textContent, category.title, 'title is set');
  });

  it('renders the sections', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const sections = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group');
    assert.equal(sections.length, 3);
  });

  it('renders the metrics', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const metricsSection = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group')[0];

    const metricAudits = category.auditRefs.filter(audit => audit.group === 'metrics');
    const timelineElements = metricsSection.querySelectorAll('.lh-metric');
    const nontimelineElements = metricsSection.querySelectorAll('.lh-audit');
    assert.equal(timelineElements.length + nontimelineElements.length, metricAudits.length);
    assert.deepStrictEqual(
      Array.from(timelineElements).map(el => el.id),
      [
        'first-contentful-paint',
        'largest-contentful-paint',
        'total-blocking-time',
        'cumulative-layout-shift',
        'speed-index',
      ]
    );
  });

  it('renders notApplicable metrics with n/a text', () => {
    const perfWithNaMetric = JSON.parse(JSON.stringify(category));
    const tbt = perfWithNaMetric.auditRefs.find(audit => audit.id === 'total-blocking-time');
    assert(tbt);
    const {id, title, description} = tbt.result;
    tbt.result = {
      id,
      title,
      description,
      scoreDisplayMode: 'notApplicable',
      score: null,
    };

    const perfDom = renderer.render(perfWithNaMetric, sampleResults.categoryGroups);
    const tbtElement = perfDom.querySelector('.lh-metric#total-blocking-time');
    assert(tbtElement);
    assert.equal(tbtElement.querySelector('.lh-metric__title').textContent, 'Total Blocking Time');
    assert.equal(tbtElement.querySelector('.lh-metric__value').textContent, '--');
  });

  it('does not render metrics section if no metric group audits', () => {
    // Remove metrics from category
    const newCategory = JSON.parse(JSON.stringify(category));
    newCategory.auditRefs = category.auditRefs.filter(audit => audit.group !== 'metrics');

    const categoryDOM = renderer.render(newCategory, sampleResults.categoryGroups);
    const sections = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group');
    const metricSection = categoryDOM.querySelector('.lh-audit-group--metrics');
    assert.ok(!metricSection);
    assert.equal(sections.length, 2);
  });

  it('renders the metrics variance disclaimer as markdown', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const disclaimerEl =
        categoryDOM.querySelector('.lh-category-header__description > .lh-metrics__disclaimer');

    assert.ok(disclaimerEl.textContent.includes('Values are estimated'));
    const disclamerLink = disclaimerEl.querySelector('a');
    assert.ok(disclamerLink, 'disclaimer contains coverted markdown link');
    const disclamerUrl = new URL(disclamerLink.href);
    assert.strictEqual(disclamerUrl.hostname, 'developer.chrome.com');
    const calcLink = disclaimerEl.querySelector('a.lh-calclink');
    assert.ok(calcLink, 'disclaimer contains scorecalc link');
    assert.strictEqual(new URL(calcLink.href).hostname, 'googlechrome.github.io');
  });

  it('does not render disclaimer if there is no category gauge', () => {
    // Timespan mode uses a category fraction instead of a gauge.
    const categoryDOM = renderer.render(
      category,
      sampleResults.categoryGroups,
      {gatherMode: 'timespan'}
    );
    const disclaimerEl = categoryDOM.querySelector('.lh-metrics__disclaimer');
    assert.ok(!disclaimerEl);
  });

  it('ignores hidden audits', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

    const hiddenAudits = category.auditRefs.filter(audit => audit.group === 'hidden');
    const auditElements = [...categoryDOM.querySelectorAll('.lh-audit')];
    const matchingElements = auditElements
      .filter(el => hiddenAudits.some(audit => audit.id === el.id));
    expect(matchingElements).toHaveLength(0);
  });

  it('renders the failing diagnostics', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const diagnosticSection = categoryDOM.querySelector(
        '.lh-category > .lh-audit-group.lh-audit-group--diagnostics');

    const diagnosticAuditIds = category.auditRefs.filter(audit => {
      return audit.group === 'diagnostics' &&
        !ReportUtils.showAsPassed(audit.result);
    }).map(audit => audit.id).sort();
    assert.ok(diagnosticAuditIds.length > 0);

    const diagnosticElementIds = [...diagnosticSection.querySelectorAll('.lh-audit')]
      .map(el => el.id).sort();
    assert.deepStrictEqual(diagnosticElementIds, diagnosticAuditIds);
  });

  it('renders the passed audits', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const passedSection = categoryDOM.querySelector('.lh-clump--passed');

    const passedAudits = category.auditRefs.filter(audit =>
      audit.group === 'diagnostics' &&
      ReportUtils.showAsPassed(audit.result));
    const passedElements = passedSection.querySelectorAll('.lh-audit');
    assert.equal(passedElements.length, passedAudits.length);
  });

  // Unsupported by perf cat renderer right now.
  it.skip('renders any manual audits', () => {
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
  "#FCP=6815",
  "LCP=10954",
  "TBT=1066",
  "CLS=0",
  "SI=8471",
  "TTI=8126",
]
`);
    });

    it('also appends device and version number', () => {
      Globals.reportJson = {
        configSettings: {formFactor: 'mobile'},
        lighthouseVersion: '6.0.0',
      };
      const href = renderer._getScoringCalculatorHref(category.auditRefs);
      const url = new URL(href);
      try {
        expect(url.hash.split('&')).toMatchInlineSnapshot(`
Array [
  "#FCP=6815",
  "LCP=10954",
  "TBT=1066",
  "CLS=0.1",
  "SI=8471",
  "TTI=8126",
  "device=mobile",
  "version=6.0.0",
]
`);
      } finally {
        Globals.reportJson = null;
      }
    });

    it('uses null if the metric\'s value is undefined', () => {
      const categoryClone = JSON.parse(JSON.stringify(category));
      const lcp = categoryClone.auditRefs.find(audit => audit.id === 'largest-contentful-paint');
      lcp.result.numericValue = undefined;
      lcp.result.score = null;
      const href = renderer._getScoringCalculatorHref(categoryClone.auditRefs);
      expect(href).toContain('LCP=null');
    });

    it('uses null if the metric\'s value is null (LR)', () => {
      const categoryClone = JSON.parse(JSON.stringify(category));
      const lcp = categoryClone.auditRefs.find(audit => audit.id === 'largest-contentful-paint');
      // In LR, we think there might be some case where undefined becomes null, but we can't prove it.
      lcp.result.numericValue = null;
      lcp.result.score = null;
      const href = renderer._getScoringCalculatorHref(categoryClone.auditRefs);
      expect(href).toContain('LCP=null');
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
      before(() => {
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

  describe('prioritize audits by metricSavings', () => {
    let metricAudits;
    let defaultAuditRef;
    let fakeCategory;

    before(() => {
      metricAudits = category.auditRefs.filter(audit => audit.group === 'metrics');
      defaultAuditRef = {
        title: '',
        description: '',
        scoreDisplayMode: 'numeric',
        warnings: [],
      };
      fakeCategory = {
        id: 'performance',
        title: 'Performance',
        score: 0.5,
        supportedModes: category.supportedModes,
      };
    });

    it('audits in order of most impact metric savings first', () => {
      fakeCategory = {
        id: 'performance',
        title: 'Performance',
        score: 0.5,
        supportedModes: category.supportedModes,
      };

      fakeCategory.auditRefs = [{
        id: 'audit-1',
        group: 'diagnostics',
        result: {
          id: 'audit-1',
          metricSavings: {'LCP': 5000, 'FCP': 1000},
          score: 0,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-2',
        group: 'diagnostics',
        result: {
          id: 'audit-2',
          score: 0.5,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-3',
        group: 'diagnostics',
        result: {
          id: 'audit-3',
          score: 0,
          metricSavings: {'LCP': 5000, 'FCP': 2000},
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-4',
        group: 'diagnostics',
        result: {
          id: 'audit-4',
          score: 0,
          metricSavings: {'FCP': 2000},
          ...defaultAuditRef,
        },
      },
      ...metricAudits];

      const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);
      const diagnosticSection = categoryDOM.querySelector(
        '.lh-category > .lh-audit-group.lh-audit-group--diagnostics');
      const diagnosticElementIds = [...diagnosticSection.querySelectorAll('.lh-audit')];
      expect(diagnosticElementIds.map(el => el.id)).toEqual(['audit-3', 'audit-1', 'audit-4', 'audit-2']); // eslint-disable-line max-len
    });

    it('audits in order of single metric savings when filter active', () => {
      fakeCategory = {
        id: 'performance',
        title: 'Performance',
        score: 0.5,
        supportedModes: category.supportedModes,
      };

      fakeCategory.auditRefs = [{
        id: 'audit-1',
        group: 'diagnostics',
        result: {
          id: 'audit-1',
          metricSavings: {'LCP': 5000, 'FCP': 1000},
          score: 0,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-2',
        group: 'diagnostics',
        result: {
          id: 'audit-2',
          score: 0.5,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-3',
        group: 'diagnostics',
        result: {
          id: 'audit-3',
          score: 0,
          metricSavings: {'LCP': 5000, 'FCP': 2000},
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-4',
        group: 'diagnostics',
        result: {
          id: 'audit-4',
          score: 0,
          metricSavings: {'FCP': 2000},
          ...defaultAuditRef,
        },
      },
      ...metricAudits];

      const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);

      const diagnosticSection = categoryDOM.querySelector(
        '.lh-category > .lh-audit-group.lh-audit-group--diagnostics');
      let diagnosticElements = [...diagnosticSection.querySelectorAll('.lh-audit')];
      expect(diagnosticElements.map(el => el.id)).toEqual(['audit-3', 'audit-1', 'audit-4', 'audit-2']); // eslint-disable-line max-len

      let hiddenElements = [...diagnosticSection.querySelectorAll('.lh-audit[hidden]')];
      expect(hiddenElements).toHaveLength(0);

      const fcpFilterButton =
        categoryDOM.querySelector('.lh-metricfilter__label[title="First Contentful Paint"]');
      fcpFilterButton.click();

      diagnosticElements = [...diagnosticSection.querySelectorAll('.lh-audit')];
      expect(diagnosticElements.map(el => el.id)).toEqual(['audit-3', 'audit-4', 'audit-1', 'audit-2']); // eslint-disable-line max-len

      hiddenElements = [...diagnosticSection.querySelectorAll('.lh-audit[hidden]')];
      expect(hiddenElements.map(el => el.id)).toEqual(['audit-2']);
    });

    it('audits sorted with guidance level', () => {
      fakeCategory.auditRefs = [{
        id: 'audit-1',
        group: 'diagnostics',
        result: {
          id: 'audit-1',
          metricSavings: {'LCP': 50, 'FCP': 5},
          score: 0,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-2',
        group: 'diagnostics',
        result: {
          id: 'audit-2',
          score: 0.5,
          guidanceLevel: 3,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-3',
        group: 'diagnostics',
        result: {
          id: 'audit-3',
          score: 0,
          metricSavings: {'LCP': 50, 'FCP': 5},
          guidanceLevel: 3,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-4',
        group: 'diagnostics',
        result: {
          id: 'audit-4',
          score: 0.5,
          guidanceLevel: 2,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-5',
        group: 'diagnostics',
        result: {
          id: 'audit-5',
          score: 0.5,
          ...defaultAuditRef,
        },
      },
      ...metricAudits];

      const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);
      const diagnosticSection = categoryDOM.querySelector(
        '.lh-category > .lh-audit-group.lh-audit-group--diagnostics');
      const diagnosticElementIds = [...diagnosticSection.querySelectorAll('.lh-audit')];
      expect(diagnosticElementIds.map(el => el.id)).toEqual(['audit-3', 'audit-1', 'audit-2', 'audit-4', 'audit-5']); // eslint-disable-line max-len
    });

    it('audits without impact and guidance level sorted', () => {
      fakeCategory.auditRefs = [{
        id: 'audit-1',
        group: 'diagnostics',
        result: {
          id: 'audit-1',
          metricSavings: {'LCP': 50, 'FCP': 5},
          score: 0,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-2',
        group: 'diagnostics',
        result: {
          id: 'audit-2',
          score: 0,
          weight: 10,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-3',
        group: 'diagnostics',
        result: {
          id: 'audit-3',
          score: 0,
          guidanceLevel: 2,
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-4',
        group: 'diagnostics',
        result: {
          id: 'audit-4',
          score: 0.5,
          ...defaultAuditRef,
        },
      },
      ...metricAudits];

      const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);
      const diagnosticSection = categoryDOM.querySelector(
        '.lh-category > .lh-audit-group.lh-audit-group--diagnostics');
      const diagnosticElementIds = [...diagnosticSection.querySelectorAll('.lh-audit')];
      expect(diagnosticElementIds.map(el => el.id)).toEqual(['audit-1', 'audit-3', 'audit-2', 'audit-4']); // eslint-disable-line max-len
    });
  });
});
