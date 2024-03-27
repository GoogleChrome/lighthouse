/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import assert from 'assert/strict';

import puppeteer from 'puppeteer';
import {getChromePath} from 'chrome-launcher';

import AccessibilityGather from '../../../gather/gatherers/accessibility.js';
import {LH_ROOT} from '../../../../shared/root.js';
import {axeSource} from '../../../../core/lib/axe.js';
import {pageFunctions} from '../../../../core/lib/page-functions.js';

describe('Accessibility gatherer', () => {
  let accessibilityGather;
  // Reset the Gatherer before each test.
  beforeEach(() => {
    accessibilityGather = new AccessibilityGather();
  });

  it('propagates error retrieving the results', () => {
    const error = 'There was an error.';
    return accessibilityGather.getArtifact({
      driver: {
        executionContext: {
          async evaluate() {
            throw new Error(error);
          },
        },
      },
    }).then(
      _ => assert.ok(false),
      err => assert.ok(err.message.includes(error)));
  });
});

describe('a11y audits + aXe', () => {
  let browser;

  before(async () => {
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
    });
  });

  after(async () => {
    await browser.close();
  });

  it('only runs the axe rules we have audits defined for', async () => {
    const page = await browser.newPage();
    page.setContent(`<!doctype html><meta charset="utf8"><title>hi</title>valid.`);
    await page.evaluate(axeSource);
    await page.evaluate(pageFunctions.getNodeDetails.toString());
    await page.evaluate(AccessibilityGather.pageFns.runA11yChecks.toString());
    await page.evaluate(AccessibilityGather.pageFns.createAxeRuleResultArtifact.toString());

    // 1. Run axe in the browser.
    const a11yArtifact = await page.evaluate(`runA11yChecks()`);
    // 2. Get list of the axe rules that ran.
    const axeRuleIds = new Set();
    for (const key of ['violations', 'incomplete', 'notApplicable', 'passes']) {
      if (a11yArtifact[key]) a11yArtifact[key].forEach(result => axeRuleIds.add(result.id));
    }

    // 3. Get audit list we have implementations for.
    // Note: audit ids match their filenames, thx to the getAuditList test in runner-test.js
    const filenames = fs.readdirSync(`${LH_ROOT}/core/audits/accessibility/`)
        .map(f => f.replace('.js', ''))
        .filter(f => f !== 'axe-audit' && f !== 'manual');

    // 4. Compare. (Received from aXe, Expected is LH audits)
    expect(Array.from(axeRuleIds).sort()).toEqual(filenames.sort());
  });
});
