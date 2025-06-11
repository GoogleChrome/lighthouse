/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import {before, beforeEach, after, afterEach} from 'mocha';
import * as puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import {Server} from '../../../cli/test/fixtures/static-server.js';
import {LH_ROOT} from '../../../shared/root.js';

/** @typedef {InstanceType<typeof import('../../../cli/test/fixtures/static-server.js').Server>} StaticServer */

/**
 * Some audits can be notApplicable based on machine timing information.
 * Exclude these audits from applicability comparisons.
 */
const FLAKY_AUDIT_IDS_APPLICABILITY = new Set([
  'long-tasks', // Depends on whether the longest task takes <50ms.
  'screenshot-thumbnails', // Depends on OS whether frames happen to be generated on non-visual timespan changes.
  'layout-shift-elements', // Depends on if the JS takes too long after input to be ignored for layout shift.
]);

const UNIT_OUTPUT_DIR = `${LH_ROOT}/.tmp/unit-failures`;

function createTestState() {
  /** @param {string} name @return {any} */
  const any = name => new Proxy({}, {get: () => {
    throw new Error(`${name} used without invoking \`state.before\``);
  }});

  /** @type {LH.Trace|undefined} */
  let trace;

  return {
    browser: /** @type {puppeteer.Browser} */ (any('browser')),
    page: /** @type {puppeteer.Page} */ (any('page')),
    server: /** @type {StaticServer} */ (any('server')),
    secondaryServer: /** @type {StaticServer} */ (any('server')),
    serverBaseUrl: '',
    secondaryServerBaseUrl: '',

    installSetupAndTeardownHooks() {
      before(async () => {
        this.server = new Server(10200);
        this.secondaryServer = new Server(10503);
        await this.server.listen(10200, '127.0.0.1');
        await this.secondaryServer.listen(10503, '127.0.0.1');
        this.serverBaseUrl = `http://localhost:${this.server.getPort()}`;
        this.secondaryServerBaseUrl = `http://localhost:${this.secondaryServer.getPort()}`;
      });

      before(async () => {
        this.browser = await puppeteer.launch({
          executablePath: getChromePath(),
          ignoreDefaultArgs: ['--enable-automation'],
        });
      });

      beforeEach(async () => {
        trace = undefined;
        this.page = await this.browser.newPage();
      });

      afterEach(async () => {
        await this.page.close();
      });

      afterEach(function() {
        // eslint-disable-next-line no-invalid-this
        const currentTest = this.currentTest;
        if (currentTest?.state === 'failed' && trace) {
          const dirname = currentTest.fullTitle().replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const testOutputDir = `${UNIT_OUTPUT_DIR}/${dirname}`;
          fs.mkdirSync(testOutputDir, {recursive: true});
          fs.writeFileSync(`${testOutputDir}/trace.json`, JSON.stringify(trace, null, 2));
        }
      });

      after(async () => {
        await this.browser.close();
      });

      after(async () => {
        await this.server.close();
        await this.secondaryServer.close();
      });
    },

    /**
     * @param {LH.Trace} testTrace
     */
    saveTrace(testTrace) {
      trace = testTrace;
    },
  };
}

/**
 * @param {LH.Result} lhr
 */
function getAuditsBreakdown(lhr) {
  const auditResults = Object.values(lhr.audits);
  const irrelevantDisplayModes = new Set(['notApplicable', 'manual']);
  const applicableAudits = auditResults.filter(
    audit => !irrelevantDisplayModes.has(audit.scoreDisplayMode)
  );

  const notApplicableAudits = auditResults.filter(
    audit => (
      audit.scoreDisplayMode === 'notApplicable' &&
      !FLAKY_AUDIT_IDS_APPLICABILITY.has(audit.id)
    )
  );

  const informativeAudits = applicableAudits.filter(
    audit => audit.scoreDisplayMode === 'informative'
  );

  const erroredAudits = applicableAudits.filter(
    audit => audit.score === null && audit && !informativeAudits.includes(audit)
  );

  const failedAudits = applicableAudits.filter(audit => audit.score !== null && audit.score < 1);

  return {auditResults, erroredAudits, failedAudits, notApplicableAudits};
}

export {
  createTestState,
  getAuditsBreakdown,
};
