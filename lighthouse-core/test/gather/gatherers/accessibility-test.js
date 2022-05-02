/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const AccessibilityGather = require('../../../gather/gatherers/accessibility.js');
const assert = require('assert').strict;
const {LH_ROOT} = require('../../../../root.js');

describe('Accessibility gatherer', () => {
  let accessibilityGather;
  // Reset the Gatherer before each test.
  beforeEach(() => {
    accessibilityGather = new AccessibilityGather();
  });

  it('propagates error retrieving the results', () => {
    const error = 'There was an error.';
    return accessibilityGather.afterPass({
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
  const axeLibSource = require('../../../lib/axe.js').source;
  const pageFunctions = require('../../../lib/page-functions.js');
  const fs = require('fs');

  beforeAll(async () => {
    browser = await require('puppeteer').launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('only runs the axe rules we have audits defined for', async () => {
    const page = await browser.newPage();
    page.setContent(`<!doctype html><meta charset="utf8"><title>hi</title>valid.`);
    await page.evaluate(axeLibSource);
    await page.evaluate(pageFunctions.getNodeDetailsString);
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
    const filenames = fs.readdirSync(`${LH_ROOT}/lighthouse-core/audits/accessibility/`)
        .map(f => f.replace('.js', ''))
        .filter(f => f !== 'axe-audit' && f !== 'manual');

    // 4. Compare. (Received from aXe, Expected is LH audits)
    expect(Array.from(axeRuleIds).sort()).toEqual(filenames.sort());
  });
});
