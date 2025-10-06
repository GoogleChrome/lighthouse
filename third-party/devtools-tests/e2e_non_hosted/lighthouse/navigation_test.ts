// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {expectError} from '../../conductor/events.js';
import {
  clickStartButton,
  getAuditsBreakdown,
  getServiceWorkerCount,
  interceptNextFileSave,
  navigateToLighthouseTab,
  registerServiceWorker,
  renderHtmlInIframe,
  selectCategories,
  selectDevice,
  setThrottlingMethod,
  setToolbarCheckboxWithText,
  waitForResult,
} from '../../e2e/helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.
function expectErrors() {
  // https://github.com/GoogleChrome/lighthouse/issues/14572
  expectError(/Request CacheStorage\.requestCacheNames failed/);

  // https://bugs.chromium.org/p/chromium/issues/detail?id=1357791
  expectError(/Protocol Error: the message with wrong session id/);
  expectError(/Protocol Error: the message with wrong session id/);
  expectError(/Protocol Error: the message with wrong session id/);
  expectError(/Protocol Error: the message with wrong session id/);
  expectError(/Protocol Error: the message with wrong session id/);
}

describe('Navigation', function() {
  setup({dockingMode: 'undocked'});

  // The tests in this suite are particularly slow
  if (this.timeout() !== 0) {
    this.timeout(60_000);
  }

  const consoleLog: string[] = [];
  const consoleListener = (e: puppeteer.ConsoleMessage) => {
    consoleLog.push(e.text());
  };

  // Flaky Lighthouse report
  it.skip('[crbug.com/445332283] successfully returns a Lighthouse report', async ({devToolsPage, inspectedPage}) => {
    devToolsPage.page.on('console', consoleListener);
    try {
      expectErrors();
      await navigateToLighthouseTab('lighthouse/hello.html', devToolsPage, inspectedPage);
      await registerServiceWorker(inspectedPage);

      await devToolsPage.waitFor('.lighthouse-start-view');
      // We don't call selectCategories explicitly, but it's implied we leave all the checkboxes checked

      let numNavigations = 0;
      inspectedPage.page.on('framenavigated', () => {
        ++numNavigations;
      });

      await clickStartButton(devToolsPage);

      const {lhr, artifacts, reportEl} = await waitForResult(devToolsPage, inspectedPage);

      const receivedCategories = Array.from(Object.keys(lhr.categories)).sort();
      const sentCategories = Array.from(lhr.configSettings.onlyCategories).sort();
      assert.deepEqual(receivedCategories, sentCategories);

      // 1 initial about:blank jump
      // 1 navigation for the actual page load
      // 2 navigations to go to chrome://terms and back testing bfcache
      // 1 refresh after auditing to reset state
      assert.strictEqual(numNavigations, 5);

      assert.strictEqual(lhr.lighthouseVersion, '12.8.2');
      assert.match(lhr.finalUrl, /^https:\/\/localhost:[0-9]+\/test\/e2e\/resources\/lighthouse\/hello.html/);

      assert.strictEqual(lhr.configSettings.throttlingMethod, 'simulate');
      assert.isFalse(lhr.configSettings.disableStorageReset);
      assert.strictEqual(lhr.configSettings.formFactor, 'mobile');
      assert.strictEqual(lhr.configSettings.throttling.rttMs, 150);
      assert.isTrue(lhr.configSettings.screenEmulation.disabled);
      assert.include(lhr.configSettings.emulatedUserAgent, 'Mobile');
      assert.include(lhr.environment.networkUserAgent, 'Mobile');

      const trace = artifacts.Trace;
      assert.isNotOk(
          trace.traceEvents.some((e: Record<string, unknown>) => e.cat === 'disabled-by-default-v8.cpu_profiler'),
          'Trace contained v8 profiler events',
      );

      assert.deepEqual(artifacts.ViewportDimensions, {
        innerHeight: 823,
        innerWidth: 412,
        outerHeight: 823,
        outerWidth: 412,
        devicePixelRatio: 1.75,
      });

      const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr, ['max-potential-fid']);
      assert.lengthOf(auditResults, 174);
      assert.deepEqual(erroredAudits, []);
      assert.deepEqual(failedAudits.map(audit => audit.id), [
        'document-title',
        'html-has-lang',
        'render-blocking-resources',
        'meta-description',
        'network-dependency-tree-insight',
        'render-blocking-insight',
      ]);

      const viewTraceButton = await devToolsPage.$textContent('View Trace', reportEl);
      assert.isNotOk(viewTraceButton);

      // Test view trace button behavior
      // For some reason the CDP click command doesn't work here even if the tools menu is open.
      await reportEl.$eval(
          'a[data-action="view-unthrottled-trace"]:not(.hidden)', saveJsonEl => (saveJsonEl as HTMLElement).click());
      let selectedTab = await devToolsPage.waitFor('.tabbed-pane-header-tab.selected[aria-label="Performance"]');
      let selectedTabText = await selectedTab.evaluate(selectedTabEl => {
        return selectedTabEl.textContent;
      });
      assert.strictEqual(selectedTabText, 'Performance');

      await navigateToLighthouseTab(undefined, devToolsPage, inspectedPage);

      // TODO: currently the "LighthouseReportRenderer.linkifyNodeDetails" doesn't run for swappable sections.
      await reportEl.$eval('.lh-button-insight-toggle', el => (el as HTMLElement).click());

      // Test element link behavior
      // TODO: fix report flakiness: the button referenced below is most of the time rendered as HTML code
      // rather than a UI button.
      const lcpElementAudit =
          await devToolsPage.waitForElementWithTextContent('Largest Contentful Paint element', reportEl);
      await lcpElementAudit.click();
      const lcpElementLink = await devToolsPage.waitForElementWithTextContent('button');
      await lcpElementLink.click();

      selectedTab = await devToolsPage.waitFor('.tabbed-pane-header-tab.selected[aria-label="Elements"]');
      selectedTabText = await selectedTab.evaluate(selectedTabEl => {
        return selectedTabEl.textContent;
      });
      assert.strictEqual(selectedTabText, 'Elements');

      const waitForJson = await interceptNextFileSave(devToolsPage);

      // For some reason the CDP click command doesn't work here even if the tools menu is open.
      await reportEl.$eval(
          'a[data-action="save-json"]:not(.hidden)', saveJsonEl => (saveJsonEl as HTMLElement).click());

      const jsonContent = await waitForJson();
      assert.strictEqual(jsonContent, JSON.stringify(lhr, null, 2));

      const waitForHtml = await interceptNextFileSave(devToolsPage);

      // For some reason the CDP click command doesn't work here even if the tools menu is open.
      await reportEl.$eval(
          'a[data-action="save-html"]:not(.hidden)', saveHtmlEl => (saveHtmlEl as HTMLElement).click());

      const htmlContent = await waitForHtml();
      const iframeHandle = await renderHtmlInIframe(htmlContent, inspectedPage);
      const iframeAuditDivs = await iframeHandle.$$('.lh-audit');
      const frontendAuditDivs = await reportEl.$$('.lh-audit');
      assert.strictEqual(frontendAuditDivs.length, iframeAuditDivs.length);

      // Ensure service worker was cleared.
      assert.strictEqual(await getServiceWorkerCount(), 0);
    } catch (e) {
      console.error(consoleLog.join('\n'));
      throw e;
    } finally {
      devToolsPage.page.off('console', consoleListener);
    }
  });

  it('successfully returns a Lighthouse report with DevTools throttling', async ({devToolsPage, inspectedPage}) => {
    devToolsPage.page.on('console', consoleListener);
    try {
      expectErrors();

      await navigateToLighthouseTab('lighthouse/hello.html', devToolsPage, inspectedPage);

      await setThrottlingMethod('devtools', devToolsPage);

      await clickStartButton(devToolsPage);

      const {lhr, reportEl} = await waitForResult(devToolsPage, inspectedPage);

      assert.strictEqual(lhr.configSettings.throttlingMethod, 'devtools');

      // [crbug.com/1347220] DevTools throttling can force resources to load slow enough for these audits to fail sometimes.
      const flakyAudits = [
        'server-response-time',
        'render-blocking-resources',
        'render-blocking-insight',
        'document-latency-insight',
        'max-potential-fid',
      ];

      const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr, flakyAudits);
      assert.lengthOf(auditResults, 174);
      assert.deepEqual(erroredAudits, []);
      assert.deepEqual(failedAudits.map(audit => audit.id), [
        'document-title',
        'html-has-lang',
        'landmark-one-main',
        'meta-description',
        'network-dependency-tree-insight',
      ]);

      const viewTraceButton = await devToolsPage.$textContent('View Trace', reportEl);
      assert.isOk(viewTraceButton);
    } catch (e) {
      console.error(consoleLog.join('\n'));
      throw e;
    } finally {
      devToolsPage.page.off('console', consoleListener);
    }
  });
});

describe('with changed settings', function() {
  setup({devToolsSettings: {language: 'es'}});

  const consoleLog: string[] = [];
  const consoleListener = (e: puppeteer.ConsoleMessage) => {
    consoleLog.push(e.text());
  };

  it('successfully returns a Lighthouse report', async ({devToolsPage, inspectedPage}) => {
    devToolsPage.page.on('console', consoleListener);
    try {
      expectErrors();
      await navigateToLighthouseTab('lighthouse/hello.html', devToolsPage, inspectedPage);
      await registerServiceWorker(inspectedPage);
      await setToolbarCheckboxWithText(true, 'Habilitar muestreo de JS', devToolsPage);
      await setToolbarCheckboxWithText(false, 'Borrar almacenamiento', devToolsPage);
      await selectCategories(['performance', 'best-practices'], devToolsPage);
      await selectDevice('desktop', devToolsPage);

      await clickStartButton(devToolsPage);

      const {reportEl, lhr, artifacts} = await waitForResult(devToolsPage, inspectedPage);

      const trace = artifacts.Trace;
      assert.isOk(
          trace.traceEvents.some((e: Record<string, unknown>) => e.cat === 'disabled-by-default-v8.cpu_profiler'),
          'Trace did not contain any v8 profiler events',
      );

      const {innerWidth, innerHeight, devicePixelRatio} = artifacts.ViewportDimensions;
      // TODO: Figure out why outerHeight can be different depending on OS
      assert.strictEqual(innerHeight, 720);
      assert.strictEqual(innerWidth, 1280);
      assert.strictEqual(devicePixelRatio, 1);

      const {erroredAudits} = getAuditsBreakdown(lhr);
      assert.deepEqual(erroredAudits, []);

      assert.deepEqual(Object.keys(lhr.categories), ['performance', 'best-practices']);
      assert.isTrue(lhr.configSettings.disableStorageReset);
      assert.strictEqual(lhr.configSettings.formFactor, 'desktop');
      assert.strictEqual(lhr.configSettings.throttling.rttMs, 40);
      assert.isTrue(lhr.configSettings.screenEmulation.disabled);
      assert.notInclude(lhr.configSettings.emulatedUserAgent, 'Mobile');
      assert.notInclude(lhr.environment.networkUserAgent, 'Mobile');

      const viewTreemapButton = await devToolsPage.$textContent('Ver gráfico de rectángulos', reportEl);
      assert.isOk(viewTreemapButton);

      const footerIssueText = await reportEl.$eval('.lh-footer__version_issue', footerIssueEl => {
        return footerIssueEl.textContent;
      });
      assert.strictEqual(lhr.i18n.rendererFormattedStrings.footerIssue, 'Notificar un problema');
      assert.strictEqual(footerIssueText, 'Notificar un problema');

      // Ensure service worker is not cleared because we disable the storage reset.
      assert.strictEqual(await getServiceWorkerCount(inspectedPage), 1);
    } catch (e) {
      console.error(consoleLog.join('\n'));
      throw e;
    } finally {
      devToolsPage.page.off('console', consoleListener);
    }
  });
});
