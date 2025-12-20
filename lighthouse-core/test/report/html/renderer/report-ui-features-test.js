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
const DOM = require('../../../../report/html/renderer/dom.js');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer.js');
const ReportUIFeatures = require('../../../../report/html/renderer/report-ui-features.js');
const CategoryRenderer = require('../../../../report/html/renderer/category-renderer.js');
const CriticalRequestChainRenderer = require(
    '../../../../report/html/renderer/crc-details-renderer.js');
const ReportRenderer = require('../../../../report/html/renderer/report-renderer.js');
const sampleResultsOrig = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');
const TEMPLATE_FILE_REPORT = fs.readFileSync(__dirname +
  '/../../../../report/html/report-template.html', 'utf8');

describe('ReportUIFeatures', () => {
  let sampleResults;
  let dom;

  /**
   * @param {LH.JSON} lhr
   */
  function render(lhr) {
    const detailsRenderer = new DetailsRenderer(dom);
    const categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    const renderer = new ReportRenderer(dom, categoryRenderer);
    const reportUIFeatures = new ReportUIFeatures(dom);
    const container = dom.find('main', dom._document);
    renderer.renderReport(lhr, container);
    reportUIFeatures.initFeatures(lhr);
    return container;
  }

  beforeAll(() => {
    global.Util = Util;
    global.I18n = I18n;
    global.ReportUIFeatures = ReportUIFeatures;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;
    global.DetailsRenderer = DetailsRenderer;
    global.CategoryRenderer = CategoryRenderer;

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

    const reportWithTemplates = TEMPLATE_FILE_REPORT
      .replace('%%LIGHTHOUSE_TEMPLATES%%', TEMPLATE_FILE);
    const document = new jsdom.JSDOM(reportWithTemplates);
    global.self = document.window;
    global.self.matchMedia = function() {
      return {
        addListener: function() {},
      };
    };

    global.HTMLElement = document.window.HTMLElement;
    global.HTMLInputElement = document.window.HTMLInputElement;

    global.window = document.window;
    global.window.getComputedStyle = function() {
      return {
        marginTop: '10px',
        height: '10px',
      };
    };

    dom = new DOM(document.window.document);
    sampleResults = Util.prepareReportResult(sampleResultsOrig);
    render(sampleResults);
  });

  afterAll(() => {
    global.self = undefined;
    global.Util = undefined;
    global.I18n = undefined;
    global.ReportUIFeatures = undefined;
    global.matchMedia = undefined;
    global.self.matchMedia = undefined;
    global.CriticalRequestChainRenderer = undefined;
    global.DetailsRenderer = undefined;
    global.CategoryRenderer = undefined;
    global.PerformanceCategoryRenderer = undefined;
    global.PwaCategoryRenderer = undefined;
    global.window = undefined;
    global.HTMLElement = undefined;
    global.HTMLInputElement = undefined;
  });

  describe('initFeatures', () => {
    it('should init a report', () => {
      const container = render(sampleResults);
      assert.equal(dom.findAll('.lh-category', container).length, 5);
    });

    it('should init a report with a single category', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      lhr.categories = {
        performance: lhr.categories.performance,
      };
      const container = render(lhr);
      assert.equal(dom.findAll('.lh-category', container).length, 1);
    });

    describe('third-party filtering', () => {
      let container;

      beforeAll(() => {
        const lhr = JSON.parse(JSON.stringify(sampleResults));
        lhr.requestedUrl = lhr.finalUrl = 'http://www.example.com';
        const webpAuditItemTemplate = sampleResults.audits['uses-webp-images'].details.items[0];
        const renderBlockingAuditItemTemplate =
          sampleResults.audits['render-blocking-resources'].details.items[0];
        const textCompressionAuditItemTemplate =
          sampleResults.audits['uses-text-compression'].details.items[0];
        // Interleave first/third party URLs to test restoring order.
        lhr.audits['uses-webp-images'].details.items = [
          {
            ...webpAuditItemTemplate,
            url: 'http://www.cdn.com/img1.jpg', // Third party, will be filtered.
          },
          {
            ...webpAuditItemTemplate,
            url: 'http://www.example.com/img2.jpg', // First party, not filtered.
          },
          {
            ...webpAuditItemTemplate,
            url: 'http://www.notexample.com/img3.jpg', // Third party, will be filtered.
          },
        ];

        // Only third party URLs to test that checkbox is hidden
        lhr.audits['render-blocking-resources'].details.items = [
          {
            ...renderBlockingAuditItemTemplate,
            url: 'http://www.cdn.com/script1.js', // Third party.
          },
          {
            ...renderBlockingAuditItemTemplate,
            url: 'http://www.google.com/script2.js', // Third party.
          },
          {
            ...renderBlockingAuditItemTemplate,
            url: 'http://www.notexample.com/script3.js', // Third party.
          },
        ];

        // Only first party URLs to test that checkbox is hidden
        lhr.audits['uses-text-compression'].details.items = [
          {
            ...textCompressionAuditItemTemplate,
            url: 'http://www.example.com/font1.ttf', // First party.
          },
          {
            ...textCompressionAuditItemTemplate,
            url: 'http://www.example.com/font2.ttf', // First party.
          },
          {
            ...textCompressionAuditItemTemplate,
            url: 'http://www.example.com/font3.ttf', // First party.
          },
        ];

        // render a report onto the UIFeature dom
        container = render(lhr);
      });

      it('filters out third party resources in details tables when checkbox is clicked', () => {
        const filterCheckbox = dom.find('#uses-webp-images .lh-3p-filter-input', container);

        function getUrlsInTable() {
          return dom
            .findAll('#uses-webp-images .lh-details .lh-text__url a:first-child', container)
            .map(el => el.textContent);
        }

        expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
        filterCheckbox.click();
        expect(getUrlsInTable()).toEqual(['/img2.jpg']);
        filterCheckbox.click();
        expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
      });

      it('adds no filter for audits in thirdPartyFilterAuditExclusions', () => {
        const checkboxClassName = 'lh-3p-filter-input';

        const yesCheckbox = dom.find(`#uses-webp-images .${checkboxClassName}`, container);
        expect(yesCheckbox).toBeTruthy();

        expect(() => dom.find(`#uses-rel-preconnect .${checkboxClassName}`, container))
          .toThrowError('query #uses-rel-preconnect .lh-3p-filter-input not found');
      });

      it('filter is disabled and checked for when just third party resources', () => {
        const filterCheckbox =
          dom.find('#render-blocking-resources .lh-3p-filter-input', container);
        expect(filterCheckbox.disabled).toEqual(true);
        expect(filterCheckbox.checked).toEqual(true);
      });

      it('filter is disabled and not checked for just first party resources', () => {
        const filterCheckbox = dom.find('#uses-text-compression .lh-3p-filter-input', container);
        expect(filterCheckbox.disabled).toEqual(true);
        expect(filterCheckbox.checked).toEqual(false);
      });
    });
  });

  describe('fireworks', () => {
    it('should render an non-all 100 report without fireworks', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      lhr.categories.performance.score = 0.5;
      const container = render(lhr);
      assert.ok(container.querySelector('.score100') === null, 'has no fireworks treatment');
    });

    it('should render an all 100 report with fireworks', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      Object.values(lhr.categories).forEach(element => {
        element.score = 1;
      });
      const container = render(lhr);
      assert.ok(container.querySelector('.score100'), 'has fireworks treatment');
    });

    it('should not render fireworks if all core categories are not present', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      delete lhr.categories.performance;
      delete lhr.categoryGroups.performace;
      Object.values(lhr.categories).forEach(element => {
        element.score = 1;
      });
      const container = render(lhr);
      assert.ok(container.querySelector('.score100') === null, 'has no fireworks treatment');
    });
  });

  describe('metric descriptions', () => {
    it('with no errors, hide by default', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      const container = render(lhr);
      assert.ok(!container.querySelector('.lh-metrics-toggle__input').checked);
    });

    it('with error, show by default', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      lhr.audits['first-contentful-paint'].errorMessage = 'Error.';
      const container = render(lhr);
      assert.ok(container.querySelector('.lh-metrics-toggle__input').checked);
    });
  });

  describe('tools button', () => {
    let window;
    let dropDown;

    beforeEach(() => {
      window = dom.document().defaultView;
      const features = new ReportUIFeatures(dom);
      features.initFeatures(sampleResults);
      dropDown = features._dropDown;
    });

    it('click should toggle active class', () => {
      dropDown._toggleEl.click();
      assert.ok(dropDown._toggleEl.classList.contains('active'));

      dropDown._toggleEl.click();
      assert.ok(!dropDown._toggleEl.classList.contains('active'));
    });


    it('Escape key removes active class', () => {
      dropDown._toggleEl.click();
      assert.ok(dropDown._toggleEl.classList.contains('active'));

      const escape = new window.KeyboardEvent('keydown', {keyCode: /* ESC */ 27});
      dom.document().dispatchEvent(escape);
      assert.ok(!dropDown._toggleEl.classList.contains('active'));
    });

    ['ArrowUp', 'ArrowDown', 'Enter', ' '].forEach((code) => {
      it(`'${code}' adds active class`, () => {
        const event = new window.KeyboardEvent('keydown', {code});
        dropDown._toggleEl.dispatchEvent(event);
        assert.ok(dropDown._toggleEl.classList.contains('active'));
      });
    });

    it('ArrowUp on the first menu element should focus the last element', () => {
      dropDown._toggleEl.click();

      const arrowUp = new window.KeyboardEvent('keydown', {bubbles: true, code: 'ArrowUp'});
      dropDown._menuEl.firstElementChild.dispatchEvent(arrowUp);

      assert.strictEqual(dom.document().activeElement, dropDown._menuEl.lastElementChild);
    });

    it('ArrowDown on the first menu element should focus the second element', () => {
      dropDown._toggleEl.click();

      const {nextElementSibling} = dropDown._menuEl.firstElementChild;
      const arrowDown = new window.KeyboardEvent('keydown', {bubbles: true, code: 'ArrowDown'});
      dropDown._menuEl.firstElementChild.dispatchEvent(arrowDown);

      assert.strictEqual(dom.document().activeElement, nextElementSibling);
    });

    it('Home on the last menu element should focus the first element', () => {
      dropDown._toggleEl.click();

      const {firstElementChild} = dropDown._menuEl;
      const home = new window.KeyboardEvent('keydown', {bubbles: true, code: 'Home'});
      dropDown._menuEl.lastElementChild.dispatchEvent(home);

      assert.strictEqual(dom.document().activeElement, firstElementChild);
    });

    it('End on the first menu element should focus the last element', () => {
      dropDown._toggleEl.click();

      const {lastElementChild} = dropDown._menuEl;
      const end = new window.KeyboardEvent('keydown', {bubbles: true, code: 'End'});
      dropDown._menuEl.firstElementChild.dispatchEvent(end);

      assert.strictEqual(dom.document().activeElement, lastElementChild);
    });

    describe('_getNextSelectableNode', () => {
      let createDiv;

      beforeAll(() => {
        createDiv = () => dom.document().createElement('div');
      });

      it('should return undefined when nodes is empty', () => {
        const nodes = [];

        const nextNode = dropDown._getNextSelectableNode(nodes);

        assert.strictEqual(nextNode, undefined);
      });

      it('should return the only node when start is defined', () => {
        const node = createDiv();

        const nextNode = dropDown._getNextSelectableNode([node], node);

        assert.strictEqual(nextNode, node);
      });

      it('should return first node when start is undefined', () => {
        const nodes = [createDiv(), createDiv()];

        const nextNode = dropDown._getNextSelectableNode(nodes);

        assert.strictEqual(nextNode, nodes[0]);
      });

      it('should return second node when start is first node', () => {
        const nodes = [createDiv(), createDiv()];

        const nextNode = dropDown._getNextSelectableNode(nodes, nodes[0]);

        assert.strictEqual(nextNode, nodes[1]);
      });

      it('should return first node when start is second node', () => {
        const nodes = [createDiv(), createDiv()];

        const nextNode = dropDown._getNextSelectableNode(nodes, nodes[1]);

        assert.strictEqual(nextNode, nodes[0]);
      });

      it('should skip the undefined node', () => {
        const nodes = [createDiv(), undefined, createDiv()];

        const nextNode = dropDown._getNextSelectableNode(nodes, nodes[0]);

        assert.strictEqual(nextNode, nodes[2]);
      });

      it('should skip the disabled node', () => {
        const disabledNode = createDiv();
        disabledNode.setAttribute('disabled', true);
        const nodes = [createDiv(), disabledNode, createDiv()];

        const nextNode = dropDown._getNextSelectableNode(nodes, nodes[0]);

        assert.strictEqual(nextNode, nodes[2]);
      });
    });

    describe('onMenuFocusOut', () => {
      beforeEach(() => {
        dropDown._toggleEl.click();
        assert.ok(dropDown._toggleEl.classList.contains('active'));
      });

      it('should toggle active class when focus relatedTarget is null', () => {
        const event = new window.FocusEvent('focusout', {relatedTarget: null});
        dropDown.onMenuFocusOut(event);

        assert.ok(!dropDown._toggleEl.classList.contains('active'));
      });

      it('should toggle active class when focus relatedTarget is document.body', () => {
        const relatedTarget = dom.document().body;
        const event = new window.FocusEvent('focusout', {relatedTarget});
        dropDown.onMenuFocusOut(event);

        assert.ok(!dropDown._toggleEl.classList.contains('active'));
      });

      it('should toggle active class when focus relatedTarget is _toggleEl', () => {
        const relatedTarget = dropDown._toggleEl;
        const event = new window.FocusEvent('focusout', {relatedTarget});
        dropDown.onMenuFocusOut(event);

        assert.ok(!dropDown._toggleEl.classList.contains('active'));
      });

      it('should not toggle active class when focus relatedTarget is a menu item', () => {
        const relatedTarget = dropDown._getNextMenuItem();
        const event = new window.FocusEvent('focusout', {relatedTarget});
        dropDown.onMenuFocusOut(event);

        assert.ok(dropDown._toggleEl.classList.contains('active'));
      });
    });
  });

  describe('data-i18n', () => {
    it('should have only valid data-i18n values in template', () => {
      const container = render(sampleResults);
      for (const node of dom.findAll('[data-i18n]', container)) {
        const val = node.getAttribute('data-i18n');
        assert.ok(val in Util.UIStrings, `Invalid data-i18n value of: "${val}" found.`);
      }
    });
  });
});
