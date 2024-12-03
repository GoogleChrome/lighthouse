/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';

import * as api from '../../index.js';
import {createTestState, getAuditsBreakdown} from './pptr-test-utils.js';
import {LH_ROOT} from '../../../shared/root.js';
import {TargetManager} from '../../gather/driver/target-manager.js';

const doubleRaf = 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))';

describe('Individual modes API', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(120_000);

  const state = createTestState();

  state.installSetupAndTeardownHooks();

  async function setupTestPage() {
    await state.page.goto(`${state.serverBaseUrl}/onclick.html`, {timeout: 90_000});
    // Wait for the javascript to run.
    await state.page.waitForSelector('button');
    await state.page.click('button');
    // Wait for the violations to appear (and console to be populated).
    await state.page.waitForSelector('input');
  }

  describe('snapshot', () => {
    beforeEach(() => {
      const {server} = state;
      server.baseDir = `${LH_ROOT}/core/test/fixtures/user-flows/snapshot-basic`;
    });

    it('should compute accessibility results on the page as-is', async () => {
      await setupTestPage();

      const result = await api.snapshot(state.page);
      if (!result) throw new Error('Lighthouse failed to produce a result');

      const {lhr, artifacts} = result;
      const url = `${state.serverBaseUrl}/onclick.html#done`;
      expect(artifacts.URL).toEqual({
        finalDisplayedUrl: url,
      });

      const accessibility = lhr.categories.accessibility;
      expect(accessibility.score).toBeLessThan(1);

      const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
      expect(auditResults.map(audit => audit.id).sort()).toMatchSnapshot();

      expect(erroredAudits).toHaveLength(0);
      expect(failedAudits.map(audit => audit.id)).toContain('label');
    });
  });

  describe('startTimespan', () => {
    beforeEach(() => {
      const {server} = state;
      server.baseDir = `${LH_ROOT}/core/test/fixtures/user-flows/snapshot-basic`;
    });

    it('should compute ConsoleMessage results across a span of time', async () => {
      const run = await api.startTimespan(state.page, {
        config: {
          extends: 'lighthouse:default',
          audits: [
            {path: 'bootup-time', options: {thresholdInMs: 10}},
          ],
        },
      });

      await setupTestPage();

      // Wait long enough to ensure a paint after button interaction.
      await state.page.evaluate(doubleRaf);

      const result = await run.endTimespan();
      if (!result) throw new Error('Lighthouse failed to produce a result');

      const {lhr, artifacts} = result;
      state.saveTrace(artifacts.Trace);
      expect(artifacts.URL).toEqual({
        finalDisplayedUrl: `${state.serverBaseUrl}/onclick.html#done`,
      });

      expect(lhr.runWarnings).toHaveLength(1);
      expect(lhr.runWarnings[0])
        .toMatch(/A page navigation was detected during the run. Using timespan mode/);

      const bestPractices = lhr.categories['best-practices'];
      expect(bestPractices.score).toBeLessThan(1);

      const {
        auditResults,
        erroredAudits,
        failedAudits,
        notApplicableAudits,
      } = getAuditsBreakdown(lhr);
      expect(auditResults.map(audit => audit.id).sort()).toMatchSnapshot();

      expect(notApplicableAudits.map(audit => audit.id).sort()).toMatchSnapshot();
      expect(notApplicableAudits.map(audit => audit.id)).not.toContain('total-blocking-time');

      expect(erroredAudits).toHaveLength(0);
      expect(failedAudits.map(audit => audit.id)).toContain('errors-in-console');

      const errorsInConsole = lhr.audits['errors-in-console'];
      if (!errorsInConsole.details) throw new Error('Error in consoles audit missing details');
      if (errorsInConsole.details.type !== 'table') throw new Error('Unexpected details');
      const errorLogs = errorsInConsole.details.items;
      const matchingLog = errorLogs.find(
        log =>
          log.source === 'console.error' &&
          String(log.description || '').includes('violations added')
      );
      // If we couldn't find it, assert something similar on the object that we know will fail
      // for a better debug message.
      if (!matchingLog) expect(errorLogs).toContain({description: /violations added/});

      // Check that network request information was computed.
      expect(lhr.audits).toHaveProperty('total-byte-weight');
      const details = lhr.audits['total-byte-weight'].details;
      if (!details || details.type !== 'table') throw new Error('Unexpected byte weight details');
      expect(details.items).toMatchObject([{url: `${state.serverBaseUrl}/onclick.html`}]);
    });

    it('should compute results from timespan after page load', async () => {
      const {page, serverBaseUrl} = state;
      await page.goto(`${serverBaseUrl}/onclick.html`);
      await page.waitForSelector('button');

      const run = await api.startTimespan(state.page);

      await page.click('button');
      await page.waitForSelector('input');

      // Wait long enough to ensure a paint after button interaction.
      await page.evaluate(doubleRaf);

      const result = await run.endTimespan();

      if (!result) throw new Error('Lighthouse failed to produce a result');

      state.saveTrace(result.artifacts.Trace);

      expect(result.artifacts.URL).toEqual({
        finalDisplayedUrl: `${serverBaseUrl}/onclick.html#done`,
      });

      const {auditResults, erroredAudits, notApplicableAudits} = getAuditsBreakdown(result.lhr);
      expect(auditResults.map(audit => audit.id).sort()).toMatchSnapshot();

      expect(notApplicableAudits.map(audit => audit.id).sort()).toMatchSnapshot();
      expect(notApplicableAudits.map(audit => audit.id)).not.toContain('total-blocking-time');

      expect(erroredAudits).toHaveLength(0);
    });

    // eslint-disable-next-line max-len
    it('should know target type of network requests from frames created before timespan', async () => {
      const spy = jestMock.spyOn(TargetManager.prototype, '_onExecutionContextCreated');
      state.server.baseDir = `${LH_ROOT}/cli/test/fixtures`;
      const {page, serverBaseUrl} = state;

      await page.goto(`${serverBaseUrl}/oopif-scripts-timespan.html`);

      const run = await api.startTimespan(state.page);
      for (const iframe of page.frames()) {
        if (iframe.url().includes('/oopif-simple-page.html')) {
          await iframe.click('button');
        }
      }
      await page.waitForNetworkIdle().catch(() => {});
      const result = await run.endTimespan();

      if (!result) throw new Error('Lighthouse failed to produce a result');

      state.saveTrace(result.artifacts.Trace);

      const networkRequestsDetails = /** @type {LH.Audit.Details.Table} */ (
        result.lhr.audits['network-requests'].details);
      const networkRequests = networkRequestsDetails?.items
        .map((r) => ({url: r.url, sessionTargetType: r.sessionTargetType}))
        // @ts-expect-error
        .sort((a, b) => a.url.localeCompare(b.url));

      // These results can change depending on which Chrome version is used.
      // The expectation here is tuned for Chromium 133.0.6876.0
      //
      // Using an older Chromium version can change which target the root
      // worker requests are associated with.
      // (also depends on --disable-field-trial-config for older versions)
      expect(networkRequests).toMatchInlineSnapshot(`
Array [
  Object {
    "sessionTargetType": "page",
    "url": "http://localhost:10200/simple-script.js",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10200/simple-script.js?esm",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10200/simple-script.js?importScripts",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10200/simple-worker.js",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10200/simple-worker.mjs",
  },
  Object {
    "sessionTargetType": "iframe",
    "url": "http://localhost:10503/simple-script.js",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10503/simple-script.js?esm",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10503/simple-script.js?importScripts",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10503/simple-worker.js",
  },
  Object {
    "sessionTargetType": "worker",
    "url": "http://localhost:10503/simple-worker.mjs",
  },
]
`);

      // Check that TargetManager is getting execution context created events even if connecting
      // to the page after they already exist.
      // There are two execution contexts, one for the main frame and one for the iframe of
      // the same origin.
      const contextCreatedMainFrameCalls =
        spy.mock.calls.filter(call => call[0].context.origin === 'http://localhost:10200');
      // For some reason, puppeteer gives us two created events for every uniqueId,
      // so using Set here to ignore that detail.
      expect(new Set(contextCreatedMainFrameCalls.map(call => call[0].context.uniqueId)).size)
        .toEqual(2);
      spy.mockRestore();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      const {server} = state;
      server.baseDir = `${LH_ROOT}/core/test/fixtures/user-flows/navigation-basic`;
    });

    it('should compute both snapshot & timespan results', async () => {
      const {page, serverBaseUrl} = state;
      const url = `${serverBaseUrl}/index.html`;
      const result = await api.navigation(page, url);
      if (!result) throw new Error('Lighthouse failed to produce a result');

      const {lhr, artifacts} = result;
      state.saveTrace(artifacts.Trace);
      expect(artifacts.URL).toEqual({
        requestedUrl: url,
        mainDocumentUrl: url,
        finalDisplayedUrl: url,
      });

      const {auditResults, failedAudits, erroredAudits} = getAuditsBreakdown(lhr);
      expect(auditResults.map(audit => audit.id).sort()).toMatchSnapshot();
      expect(erroredAudits).toHaveLength(0);

      const failedAuditIds = failedAudits.map(audit => audit.id);
      expect(failedAuditIds).toContain('label');
      expect(failedAuditIds).toContain('errors-in-console');

      // Check that network request information was computed.
      expect(lhr.audits).toHaveProperty('total-byte-weight');
      const details = lhr.audits['total-byte-weight'].details;
      if (!details || details.type !== 'table') throw new Error('Unexpected byte weight details');
      expect(details.items).toMatchObject([{url}]);

      // Check that performance metrics were computed.
      expect(lhr.audits).toHaveProperty('first-contentful-paint');
      expect(Number.isFinite(lhr.audits['first-contentful-paint'].numericValue)).toBe(true);
    });

    it('should compute results with callback requestor', async () => {
      const {page, serverBaseUrl} = state;
      const requestedUrl = `${serverBaseUrl}/?redirect=/index.html`;
      const mainDocumentUrl = `${serverBaseUrl}/index.html`;
      await page.goto(`${serverBaseUrl}/links-to-index.html`);

      const requestor = jestMock.fn(async () => {
        await page.click('a');
      });

      const result = await api.navigation(page, requestor);
      if (!result) throw new Error('Lighthouse failed to produce a result');

      expect(requestor).toHaveBeenCalled();

      const {lhr, artifacts} = result;
      state.saveTrace(artifacts.Trace);
      expect(lhr.requestedUrl).toEqual(requestedUrl);
      expect(lhr.finalDisplayedUrl).toEqual(mainDocumentUrl);
      expect(artifacts.URL).toEqual({
        requestedUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      });

      const {auditResults, failedAudits, erroredAudits} = getAuditsBreakdown(lhr);
      expect(auditResults.map(audit => audit.id).sort()).toMatchSnapshot();
      expect(erroredAudits).toHaveLength(0);

      const failedAuditIds = failedAudits.map(audit => audit.id);
      expect(failedAuditIds).toContain('label');
      expect(failedAuditIds).toContain('errors-in-console');

      // Check that network request information was computed.
      expect(lhr.audits).toHaveProperty('total-byte-weight');
      const details = lhr.audits['total-byte-weight'].details;
      if (!details || details.type !== 'table') throw new Error('Unexpected byte weight details');
      expect(details.items).toMatchObject([
        {url: mainDocumentUrl},
        {url: `${serverBaseUrl}/?redirect=/index.html`},
      ]);

      // Check that performance metrics were computed.
      expect(lhr.audits).toHaveProperty('first-contentful-paint');
      expect(Number.isFinite(lhr.audits['first-contentful-paint'].numericValue)).toBe(true);
    });
  });
});
