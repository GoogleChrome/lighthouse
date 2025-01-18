/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import jsdom from 'jsdom';
import jestMock from 'jest-mock';

import {reportAssets} from '../../generator/report-assets.js';
import {ReportUtils, UIStrings} from '../../renderer/report-utils.js';
import {DOM} from '../../renderer/dom.js';
import {DetailsRenderer} from '../../renderer/details-renderer.js';
import {ReportUIFeatures} from '../../renderer/report-ui-features.js';
import {CategoryRenderer} from '../../renderer/category-renderer.js';
import {ReportRenderer} from '../../renderer/report-renderer.js';
import {readJson} from '../../../core/test/test-utils.js';

const sampleResultsOrig = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('ReportUIFeatures', () => {
  let sampleResults;
  let dom;

  /**
   * @param {LH.JSON} lhr
   * @param {LH.Renderer.Options=} opts
   * @return {HTMLElement}
   */
  function render(lhr, opts) {
    const detailsRenderer = new DetailsRenderer(dom);
    const categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    const renderer = new ReportRenderer(dom, categoryRenderer);
    const reportUIFeatures = new ReportUIFeatures(dom, opts);
    const container = dom.find('body', dom.document());
    renderer.renderReport(lhr, container, opts);
    reportUIFeatures.initFeatures(lhr);
    return container;
  }

  before(() => {
    global.console.warn = jestMock.fn();

    // Stub out matchMedia for Node.
    global.matchMedia = function() {
      return {
        addListener: function() {},
      };
    };

    const document = new jsdom.JSDOM(reportAssets.REPORT_TEMPLATE);
    global.self = document.window;
    global.self.matchMedia = function() {
      return {
        addListener: function() {},
      };
    };

    global.HTMLElement = document.window.HTMLElement;
    global.HTMLInputElement = document.window.HTMLInputElement;
    global.CustomEvent = document.window.CustomEvent;

    global.window = document.window;
    global.window.requestAnimationFrame = fn => fn();
    global.window.getComputedStyle = function() {
      return {
        marginTop: '10px',
        height: '10px',
      };
    };
    global.window.ResizeObserver = class ResizeObserver {
      observe() { }
      unobserve() { }
    };

    dom = new DOM(document.window.document);
    sampleResults = ReportUtils.prepareReportResult(sampleResultsOrig);
    render(sampleResults);
  });

  after(() => {
    global.window = undefined;
    global.HTMLElement = undefined;
    global.HTMLInputElement = undefined;
    global.CustomEvent = undefined;
  });

  describe('initFeatures', () => {
    it('should init a report', () => {
      const container = render(sampleResults);
      assert.equal(dom.findAll('.lh-category', container).length, 4);
    });

    it('should init a report with a single category', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      lhr.categories = {
        performance: lhr.categories.performance,
      };
      const container = render(lhr);
      assert.equal(dom.findAll('.lh-category', container).length, 1);
    });

    describe('view trace button', () => {
      it('is shown in report if callback provided and not simulated throttling', () => {
        const onViewTrace = jestMock.fn();
        const lhr = JSON.parse(JSON.stringify(sampleResults));
        lhr.configSettings.throttlingMethod = 'devtools';
        const container = render(lhr, {onViewTrace});

        const buttons = dom.findAll('.lh-button', container);
        expect(buttons).toHaveLength(3);

        const viewUnthrottledTraceButton =
          dom.find('a[data-action="view-unthrottled-trace"]', container);
        expect(viewUnthrottledTraceButton.classList).toContain('lh-hidden');

        const viewTraceButton = buttons[2];
        expect(viewTraceButton.textContent).toEqual('View Trace');

        viewTraceButton.click();
        expect(onViewTrace).toHaveBeenCalled();
      });

      it('is shown in dropdown if callback provided and using simulated throttling', () => {
        const onViewTrace = jestMock.fn();
        const lhr = JSON.parse(JSON.stringify(sampleResults));
        lhr.configSettings.throttlingMethod = 'simulate';
        const container = render(lhr, {onViewTrace});

        const buttons = dom.findAll('.lh-button', container);
        expect(buttons).toHaveLength(2);

        const viewUnthrottledTraceButton =
          dom.find('a[data-action="view-unthrottled-trace"]', container);
        expect(viewUnthrottledTraceButton.classList).not.toContain('lh-hidden');
        expect(viewUnthrottledTraceButton.textContent).toEqual('View Unthrottled Trace');

        viewUnthrottledTraceButton.click();
        expect(onViewTrace).toHaveBeenCalled();
      });

      it('is not shown in dropdown or report if callback not provided', () => {
        const lhr = JSON.parse(JSON.stringify(sampleResults));
        const container = render(lhr);

        const buttons = dom.findAll('.lh-button', container);
        expect(buttons).toHaveLength(2);

        const viewUnthrottledTraceButton =
          dom.find('a[data-action="view-unthrottled-trace"]', container);
        expect(viewUnthrottledTraceButton.classList).toContain('lh-hidden');
      });
    });

    describe('third-party filtering', () => {
      let lhrJson;

      before(() => {
        const lhr = JSON.parse(JSON.stringify(sampleResults));
        lhr.requestedUrl = lhr.finalDisplayedUrl = 'http://www.example.com';

        const webpAuditItemTemplate = {
          ...sampleResults.audits['modern-image-formats'].details.items[0],
          wastedBytes: 8.8 * 1024,
          entity: undefined, // Remove entity classification from previous result.
        };
        const renderBlockingAuditItemTemplate = {
          ...sampleResults.audits['render-blocking-resources'].details.items[0],
          entity: undefined, // Remove entity classification from previous result.
        };
        const textCompressionAuditItemTemplate = {
          ...sampleResults.audits['uses-text-compression'].details.items[0],
          entity: undefined, // Remove entity classification from previous result.
        };
        const bootupTimeAuditItemTemplate = {
          ...sampleResults.audits['bootup-time'].details.items[0],
          entity: undefined, // Remove entity classification from previous result.
        };

        // Interleave first/third party URLs to test restoring order.
        lhr.audits['modern-image-formats'].details.items = [
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

        // Test sub-item rows.
        lhr.audits['unused-javascript'].details.items = [
          {
            ...webpAuditItemTemplate,
            url: 'http://www.cdn.com/script1.js', // Third party, will be filtered.
            subItems: {
              type: 'subitems',
              items: [
                {source: '1', sourceBytes: 1, sourceWastedBytes: 1},
                {source: '2', sourceBytes: 2, sourceWastedBytes: 2},
              ],
            },
          },
          {
            ...webpAuditItemTemplate,
            url: 'http://www.example.com/script2.js', // First party, not filtered.
            subItems: {
              type: 'subitems',
              items: [
                {source: '3', sourceBytes: 3, sourceWastedBytes: 3},
                {source: '4', sourceBytes: 4, sourceWastedBytes: 4},
              ],
            },
          },
          {
            ...webpAuditItemTemplate,
            url: 'http://www.notexample.com/script3.js', // Third party, will be filtered.
            subItems: {
              type: 'subitems',
              items: [
                {source: '5', sourceBytes: 5, sourceWastedBytes: 5},
                {source: '6', sourceBytes: 6, sourceWastedBytes: 6},
              ],
            },
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

        // A mix of 3P, 1P and Unattributable.
        lhr.audits['bootup-time'].details.items = [
          {
            ...bootupTimeAuditItemTemplate,
            url: 'http://www.example.com/dobetterweb/dbw_tester.html',
          },
          {
            ...bootupTimeAuditItemTemplate,
            url: 'Unattributable',
          },
          {
            ...bootupTimeAuditItemTemplate,
            url: 'http://www.example.com/dobetterweb/third_party/aggressive-promise-polyfill.js',
          },
          {
            ...bootupTimeAuditItemTemplate,
            url: 'http://www.cdn.com/script1.js',
          },
        ];

        lhrJson = lhr;
      });

      describe('entity-classification based filtering works', () => {
        let container;

        before(() => {
          // Setup entity-classification with recognized entities first.
          lhrJson.entities = [
            {
              name: 'example.com',
              isFirstParty: true,
              isUnrecognized: true,
              origins: ['http://www.example.com'],
            },
            {
              name: 'cdn.com',
              isUnrecognized: true,
              origins: ['http://www.cdn.com'],
            },
            {
              name: 'notexample.com',
              isUnrecognized: true,
              origins: ['http://www.notexample.com'],
            },
            {
              name: 'google.com',
              origins: ['http://www.google.com'],
            },
          ];

          // Entity resolution is done during prepareReportResult
          const result = ReportUtils.prepareReportResult(lhrJson);

          // render a report onto the UIFeature dom
          container = render(result);
        });

        it('all items that contain a url have been marked with an entity for filtering', () => {
          ['modern-image-formats', 'render-blocking-resources', 'unused-javascript',
            'uses-text-compression'].forEach(audit => {
            dom.findAll(`#${audit} tr`, container)
              .filter(el => dom.findAll('.lh-text__url', el).length > 0)
              .forEach(el => expect(el.dataset.entity).toBeTruthy());
          });
        });

        it('filters out third party resources in on click', () => {
          const filterCheckbox = dom.find('#modern-image-formats .lh-3p-filter-input', container);

          function getUrlsInTable() {
            return dom
              .findAll('#modern-image-formats tr:not(.lh-row--hidden) .lh-text__url a:first-child', container) // eslint-disable-line max-len
              .map(el => el.textContent);
          }

          expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
          filterCheckbox.click();
          expect(getUrlsInTable()).toEqual(['/img2.jpg']);
          filterCheckbox.click();
          expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);

          const filter3pCount = dom.find('#modern-image-formats .lh-3p-filter-count', container);
          expect(filter3pCount.textContent).toEqual('2');
        });

        it('filters out sub-item rows of third party resources on click', () => {
          const auditEl = dom.find('#unused-javascript', container);
          const filterCheckbox = dom.find('.lh-3p-filter-input', auditEl);

          // ensure filter checkbox is visible
          expect(dom.find('.lh-3p-filter', auditEl).hidden).toBeFalsy();

          function getRowIdentifiers() {
            return dom
              .findAll(
                'tbody tr:not(.lh-row--hidden)', auditEl)
              .map(el => el.textContent);
          }

          const initialExpected = [
            'cdn.com110.1 KiB8.8 KiB',
            '/script1.js(www.cdn.com)110.1 KiB8.8 KiB',
            '10.0 KiB0.0 KiB',
            '20.0 KiB0.0 KiB',
            'example.com 1st party110.1 KiB8.8 KiB',
            '/script2.js(www.example.com)110.1 KiB8.8 KiB',
            '30.0 KiB0.0 KiB',
            '40.0 KiB0.0 KiB',
            'notexample.com110.1 KiB8.8 KiB',
            '/script3.js(www.notexample.com)110.1 KiB8.8 KiB',
            '50.0 KiB0.0 KiB',
            '60.0 KiB0.0 KiB',
          ];

          expect(getRowIdentifiers()).toEqual(initialExpected);
          // Ensure zebra striping isn't used for grouped tables.
          expect(dom.findAll('tbody .lh-row--even', auditEl).length).toEqual(0);

          filterCheckbox.click();
          expect(dom.findAll('tbody .lh-row--even', auditEl).length).toEqual(0);
          expect(getRowIdentifiers()).toEqual([
            'example.com 1st party110.1 KiB8.8 KiB',
            '/script2.js(www.example.com)110.1 KiB8.8 KiB',
            '30.0 KiB0.0 KiB',
            '40.0 KiB0.0 KiB',
          ]);

          filterCheckbox.click();
          expect(dom.findAll('tbody .lh-row--even', auditEl).length).toEqual(0);
          expect(getRowIdentifiers()).toEqual(initialExpected);

          const filter3pCount = dom.find('#unused-javascript .lh-3p-filter-count', auditEl);
          expect(filter3pCount.textContent).toEqual('2');
        });

        it('adds no filter for audits in thirdPartyFilterAuditExclusions', () => {
          const checkboxClassName = 'lh-3p-filter-input';

          const yesCheckbox = dom.find(`#modern-image-formats .${checkboxClassName}`, container);
          expect(yesCheckbox).toBeTruthy();

          expect(() => dom.find(`#uses-rel-preconnect .${checkboxClassName}`, container))
            .toThrowError('query #uses-rel-preconnect .lh-3p-filter-input not found');
        });

        it('filter is hidden when just third party resources', () => {
          const filterControl =
            dom.find('#render-blocking-resources .lh-3p-filter', container);
          expect(filterControl.hidden).toEqual(true);
          // Expect the hidden filter to still count third parties correctly.
          const filter3pCount = dom.find('#render-blocking-resources .lh-3p-filter-count',
            container);
          expect(filter3pCount.textContent).toEqual('3');
        });

        it('filter is hidden for just first party resources', () => {
          const filterControl = dom.find('#uses-text-compression .lh-3p-filter', container);
          expect(filterControl.hidden).toEqual(true);
          // Expect the hidden filter to still count third parties correctly.
          const filter3pCount = dom.find('#uses-text-compression .lh-3p-filter-count', container);
          expect(filter3pCount.textContent).toEqual('0');
        });
      });

      describe('legacy third-party filtering continues to work', () => {
        let container;

        before(() => {
          // Remove entity-classification audit to fall back to origin string match
          // based third-party filtering (legacy)
          delete lhrJson.entities;

          const result = ReportUtils.prepareReportResult(lhrJson);

          // render a report onto the UIFeature dom
          container = render(result);
        });

        it('filters out third party resources in on click', () => {
          const filterCheckbox = dom.find('#modern-image-formats .lh-3p-filter-input', container);

          // ensure filter checkbox is visible
          expect(dom.find('#modern-image-formats .lh-3p-filter', container).hidden).toBeFalsy();

          function getUrlsInTable() {
            return dom
              .findAll('#modern-image-formats tr:not(.lh-row--hidden) .lh-text__url a:first-child', container) // eslint-disable-line max-len
              .map(el => el.textContent);
          }

          expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
          filterCheckbox.click();
          expect(getUrlsInTable()).toEqual(['/img2.jpg']);
          filterCheckbox.click();
          expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
          const filter3pCount = dom.find('#modern-image-formats .lh-3p-filter-count', container);
          expect(filter3pCount.textContent).toEqual('2');
        });

        it('filters out sub-item rows of third party resources on click', () => {
          dom.find('#unused-javascript', container);
          const filterCheckbox = dom.find('#unused-javascript .lh-3p-filter-input', container);

          // ensure filter checkbox is visible
          expect(dom.find('#unused-javascript .lh-3p-filter', container).hidden).toBeFalsy();

          function getRowIdentifiers() {
            return dom
              .findAll(
                '#unused-javascript tbody tr:not(.lh-row--hidden)', container)
              .map(el => el.textContent);
          }

          const initialExpected = [
            '/script1.js(www.cdn.com)110.1 KiB8.8 KiB',
            '10.0 KiB0.0 KiB',
            '20.0 KiB0.0 KiB',
            '/script2.js(www.example.com)110.1 KiB8.8 KiB',
            '30.0 KiB0.0 KiB',
            '40.0 KiB0.0 KiB',
            '/script3.js(www.notexample.com)110.1 KiB8.8 KiB',
            '50.0 KiB0.0 KiB',
            '60.0 KiB0.0 KiB',
          ];

          expect(getRowIdentifiers()).toEqual(initialExpected);
          filterCheckbox.click();
          expect(getRowIdentifiers()).toEqual([
            '/script2.js(www.example.com)110.1 KiB8.8 KiB',
            '30.0 KiB0.0 KiB',
            '40.0 KiB0.0 KiB',
          ]);
          filterCheckbox.click();
          expect(getRowIdentifiers()).toEqual(initialExpected);

          const filter3pCount = dom.find('#unused-javascript .lh-3p-filter-count', container);
          expect(filter3pCount.textContent).toEqual('2');
        });

        it('adds no filter for audits in thirdPartyFilterAuditExclusions', () => {
          const checkboxClassName = 'lh-3p-filter-input';

          const yesCheckbox = dom.find(`#modern-image-formats .${checkboxClassName}`, container);
          expect(yesCheckbox).toBeTruthy();

          expect(() => dom.find(`#uses-rel-preconnect .${checkboxClassName}`, container))
            .toThrowError('query #uses-rel-preconnect .lh-3p-filter-input not found');
        });

        it('treats non-classifiable url values as first-party', () => {
          const auditEl = dom.find('#bootup-time', container);
          const filterCheckboxEl = dom.find('.lh-3p-filter-input', auditEl);

          // Ensure 3p filter is visible.
          expect(dom.find('.lh-3p-filter', auditEl).hidden).toBeFalsy();

          function getUrlsInTable() {
            return dom.findAll('tbody tr:not(.lh-row--hidden) td:first-child', auditEl)
              .map(el => el.textContent);
          }

          const preFilterRowSet = [
            '/dobetterweb/dbw_tester.html(www.example.com)',
            'Unattributable',
            '…third_party/aggressive-promise-polyfill.js(www.example.com)',
            '/script1.js(www.cdn.com)',
          ];

          expect(getUrlsInTable()).toEqual(preFilterRowSet);
          filterCheckboxEl.click();
          expect(getUrlsInTable()).toEqual(preFilterRowSet.filter(
            text => !text.includes('cdn.com')));
          filterCheckboxEl.click();
          expect(getUrlsInTable()).toEqual(preFilterRowSet);

          const filter3pCountEl = dom.find('.lh-3p-filter-count', auditEl);
          expect(filter3pCountEl.textContent).toEqual('1');
        });

        it('filter is hidden when just third party resources', () => {
          const filterControl =
            dom.find('#render-blocking-resources .lh-3p-filter', container);
          expect(filterControl.hidden).toEqual(true);
          // Expect the hidden filter to still count third parties correctly.
          const filter3pCount = dom.find('#render-blocking-resources .lh-3p-filter-count',
            container);
          expect(filter3pCount.textContent).toEqual('3');
        });

        it('filter is hidden for just first party resources', () => {
          const filterControl = dom.find('#uses-text-compression .lh-3p-filter', container);
          expect(filterControl.hidden).toEqual(true);
          // Expect the hidden filter to still count third parties correctly.
          const filter3pCount = dom.find('#uses-text-compression .lh-3p-filter-count', container);
          expect(filter3pCount.textContent).toEqual('0');
        });
      });

      describe('legacy third-party filtering continues to work', () => {
        let container;

        before(() => {
          // Remove entity-classification audit to fall back to origin string match
          // based third-party filtering (legacy)
          delete lhrJson.entities;

          const result = ReportUtils.prepareReportResult(lhrJson);

          // render a report onto the UIFeature dom
          container = render(result);
        });

        it('filters out third party resources in on click', () => {
          const filterCheckbox = dom.find('#modern-image-formats .lh-3p-filter-input', container);

          function getUrlsInTable() {
            return dom
              .findAll('#modern-image-formats tr:not(.lh-row--hidden) .lh-text__url a:first-child', container) // eslint-disable-line max-len
              .map(el => el.textContent);
          }

          expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
          filterCheckbox.click();
          expect(getUrlsInTable()).toEqual(['/img2.jpg']);
          filterCheckbox.click();
          expect(getUrlsInTable()).toEqual(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
          const filter3pCount = dom.find('#modern-image-formats .lh-3p-filter-count', container);
          expect(filter3pCount.textContent).toEqual('2');
        });

        it('filters out sub-item rows of third party resources on click', () => {
          dom.find('#unused-javascript', container);
          const filterCheckbox = dom.find('#unused-javascript .lh-3p-filter-input', container);

          function getRowIdentifiers() {
            return dom
              .findAll(
                '#unused-javascript tbody tr:not(.lh-row--hidden)', container)
              .map(el => el.textContent);
          }

          const initialExpected = [
            '/script1.js(www.cdn.com)110.1 KiB8.8 KiB',
            '10.0 KiB0.0 KiB',
            '20.0 KiB0.0 KiB',
            '/script2.js(www.example.com)110.1 KiB8.8 KiB',
            '30.0 KiB0.0 KiB',
            '40.0 KiB0.0 KiB',
            '/script3.js(www.notexample.com)110.1 KiB8.8 KiB',
            '50.0 KiB0.0 KiB',
            '60.0 KiB0.0 KiB',
          ];

          expect(getRowIdentifiers()).toEqual(initialExpected);
          filterCheckbox.click();
          expect(getRowIdentifiers()).toEqual([
            '/script2.js(www.example.com)110.1 KiB8.8 KiB',
            '30.0 KiB0.0 KiB',
            '40.0 KiB0.0 KiB',
          ]);

          filterCheckbox.click();
          expect(getRowIdentifiers()).toEqual(initialExpected);
          const filter3pCount = dom.find('#unused-javascript .lh-3p-filter-count', container);
          expect(filter3pCount.textContent).toEqual('2');
        });

        it('adds no filter for audits in thirdPartyFilterAuditExclusions', () => {
          const checkboxClassName = 'lh-3p-filter-input';

          const yesCheckbox = dom.find(`#modern-image-formats .${checkboxClassName}`, container);
          expect(yesCheckbox).toBeTruthy();

          expect(() => dom.find(`#uses-rel-preconnect .${checkboxClassName}`, container))
            .toThrowError('query #uses-rel-preconnect .lh-3p-filter-input not found');
        });

        it('filter is hidden when just third party resources', () => {
          const filterControl =
            dom.find('#render-blocking-resources .lh-3p-filter', container);
          expect(filterControl.hidden).toEqual(true);
          // Expect the hidden filter to still count third parties correctly.
          const filter3pCount = dom.find('#render-blocking-resources .lh-3p-filter-count',
            container);
          expect(filter3pCount.textContent).toEqual('3');
        });

        it('filter is hidden for just first party resources', () => {
          const filterControl = dom.find('#uses-text-compression .lh-3p-filter', container);
          expect(filterControl.hidden).toEqual(true);
          // Expect the hidden filter to still count third parties correctly.
          const filter3pCount = dom.find('#uses-text-compression .lh-3p-filter-count',
            container);
          expect(filter3pCount.textContent).toEqual('0');
        });
      });
    });

    it('save-html option enabled if callback present', () => {
      let container = render(sampleResults);
      const getSaveEl = () => dom.find('a[data-action="save-html"]', container);
      expect(getSaveEl().classList.contains('lh-hidden')).toBeTruthy();

      const getHtmlMock = jestMock.fn();
      container = render(sampleResults, {
        getStandaloneReportHTML: getHtmlMock,
      });
      expect(getSaveEl().classList.contains('lh-hidden')).toBeFalsy();

      expect(getHtmlMock).not.toBeCalled();
      getSaveEl().click();
      expect(getHtmlMock).toBeCalled();
    });
  });

  describe('fireworks', () => {
    it('should render an non-all 100 report without fireworks', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      lhr.categories.performance.score = 0.5;
      const container = render(lhr);
      assert.ok(container.querySelector('.lh-score100') === null, 'has no fireworks treatment');
    });

    it('should render an all 100 report with fireworks', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      Object.values(lhr.categories).forEach(element => {
        element.score = 1;
      });
      const container = render(lhr);
      assert.ok(container.querySelector('.lh-score100'), 'has fireworks treatment');
    });

    it('should show fireworks for all 100s except plugins', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      Object.values(lhr.categories).forEach(element => {
        element.score = 1;
      });

      lhr.categories['lighthouse-plugin-someplugin'] = {
        id: 'lighthouse-plugin-someplugin',
        title: 'Some Plugin',
        auditRefs: [],
        score: 0,
      };

      const container = render(lhr);
      assert.ok(container.querySelector('.lh-score100'), 'has fireworks treatment');
    });

    it('should not render fireworks if all core categories are not present', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));
      delete lhr.categories.performance;
      delete lhr.categoryGroups.performace;
      Object.values(lhr.categories).forEach(element => {
        element.score = 1;
      });
      const container = render(lhr);
      assert.ok(container.querySelector('.lh-score100') === null, 'has no fireworks treatment');
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
      dropDown = features._topbar._dropDownMenu;
    });

    it('click should toggle active class', () => {
      dropDown._toggleEl.click();
      assert.ok(dropDown._toggleEl.classList.contains('lh-active'));

      dropDown._toggleEl.click();
      assert.ok(!dropDown._toggleEl.classList.contains('lh-active'));
    });

    it('Escape key removes active class', () => {
      dropDown._toggleEl.click();
      assert.ok(dropDown._toggleEl.classList.contains('lh-active'));

      const escape = new window.KeyboardEvent('keydown', {keyCode: /* ESC */ 27});
      dom.document().dispatchEvent(escape);
      assert.ok(!dropDown._toggleEl.classList.contains('lh-active'));
    });

    ['ArrowUp', 'ArrowDown', 'Enter', ' '].forEach((code) => {
      it(`'${code}' adds active class`, () => {
        const event = new window.KeyboardEvent('keydown', {code});
        dropDown._toggleEl.dispatchEvent(event);
        assert.ok(dropDown._toggleEl.classList.contains('lh-active'));
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

      before(() => {
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
        assert.ok(dropDown._toggleEl.classList.contains('lh-active'));
      });

      it('should toggle active class when focus relatedTarget is null', () => {
        const event = new window.FocusEvent('focusout', {relatedTarget: null});
        dropDown.onMenuFocusOut(event);

        assert.ok(!dropDown._toggleEl.classList.contains('lh-active'));
      });

      it('should toggle active class when focus relatedTarget is document.body', () => {
        const relatedTarget = dom.document().body;
        const event = new window.FocusEvent('focusout', {relatedTarget});
        dropDown.onMenuFocusOut(event);

        assert.ok(!dropDown._toggleEl.classList.contains('lh-active'));
      });

      it('should toggle active class when focus relatedTarget is _toggleEl', () => {
        const relatedTarget = dropDown._toggleEl;
        const event = new window.FocusEvent('focusout', {relatedTarget});
        dropDown.onMenuFocusOut(event);

        assert.ok(!dropDown._toggleEl.classList.contains('lh-active'));
      });

      it('should not toggle active class when focus relatedTarget is a menu item', () => {
        const relatedTarget = dropDown._getNextMenuItem();
        const event = new window.FocusEvent('focusout', {relatedTarget});
        dropDown.onMenuFocusOut(event);

        assert.ok(dropDown._toggleEl.classList.contains('lh-active'));
      });
    });
  });

  describe('treemap button', () => {
    it('should only show button if treemap data is available', () => {
      const lhr = JSON.parse(JSON.stringify(sampleResults));

      expect(lhr.audits['script-treemap-data']).not.toBeUndefined();
      expect(render(lhr).querySelector('.lh-button.lh-report-icon--treemap')).toBeTruthy();

      delete lhr.audits['script-treemap-data'];
      const newAuditRefs = lhr.categories['performance'].auditRefs
        .filter(a => a.id !== 'script-treemap-data');
      lhr.categories['performance'].auditRefs = newAuditRefs;
      expect(render(lhr).querySelector('.lh-button.lh-report-icon--treemap')).toBeNull();
    });
  });

  describe('data-i18n', () => {
    it('should have only valid data-i18n values in template', () => {
      const container = render(sampleResults);
      for (const node of dom.findAll('[data-i18n]', container)) {
        const val = node.getAttribute('data-i18n');
        assert.ok(val in UIStrings, `Invalid data-i18n value of: "${val}" not found.`);
      }
    });
  });
});
