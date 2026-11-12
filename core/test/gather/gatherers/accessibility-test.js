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
import FrameTitleUnique from '../../../audits/accessibility/frame-title-unique.js';
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

  it('surfaces duplicate frame titles for manual review', async () => {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><title>Frames</title>
      <iframe id="first" title="Preview"></iframe>
      <iframe id="second" title="Preview"></iframe>`);
    await page.evaluate(axeSource);
    await page.evaluate(pageFunctions.getNodeDetails.toString());
    await page.evaluate(AccessibilityGather.pageFns.runA11yChecks.toString());
    await page.evaluate(AccessibilityGather.pageFns.createAxeRuleResultArtifact.toString());

    const a11yArtifact = await page.evaluate('runA11yChecks()');
    const output = FrameTitleUnique.audit({Accessibility: a11yArtifact});

    expect(FrameTitleUnique.meta.scoreDisplayMode).toBe('informative');
    expect(output.details.items).toHaveLength(1);
    expect(output.details.items[0].node.selector).toBe('body > iframe#first');

    await page.$eval('#second', frame => frame.setAttribute('title', 'Other preview'));
    const uniqueTitlesArtifact = await page.evaluate('runA11yChecks()');
    const uniqueTitlesOutput = FrameTitleUnique.audit({Accessibility: uniqueTitlesArtifact});
    expect(uniqueTitlesOutput.notApplicable).toBe(true);
    await page.close();
  });
});
