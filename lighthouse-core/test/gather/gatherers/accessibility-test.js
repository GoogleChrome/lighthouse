/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const AccessibilityGather = require('../../../gather/gatherers/accessibility.js');
const assert = require('assert').strict;
let accessibilityGather;

describe('Accessibility gatherer', () => {
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

describe('axe-run', () => {
  /**
   * @jest-environment jsdom
   */
  const fs = require('fs');
  const jsdom = require('jsdom');
  const pageFunctions = require('../../../lib/page-functions.js');

  const jdomObj = new jsdom.JSDOM(`<!doctype html><meta charset="utf8"><title>hi</title>valid.`);
  let axe;

  beforeAll(() =>{
    // Needed by axe-core
    // https://github.com/dequelabs/axe-core/blob/581c441c/doc/examples/jsdom/test/a11y.js#L24
    global.window = global.self = jdomObj.window;
    global.document = jdomObj.window.document;
    global.getNodeDetails = pageFunctions.getNodeDetails;

    // axe-core must be required after the global polyfills
    axe = require('axe-core'); // eslint-disable-line no-unused-vars
  });

  afterAll(() => {
    global.window = undefined;
    global.document = undefined;
    global.getNodeDetails = undefined;
  });

  it('tests only the checks we have audits defined for', async () => {
    // The color-contrast rule is manually disabled as jsdom doesn't support the APIs needed. https://github.com/dequelabs/axe-core/blob/581c441c/doc/examples/jsdom/test/a11y.js#L40
    const axeResults = await AccessibilityGather.runAxeForTest(undefined, {
      colorContrastEnabled: false,
    });

    const axeRuleIds = new Set();
    for (const type of ['violations', 'incomplete', 'inapplicable', 'passes']) {
      if (axeResults[type]) axeResults[type].forEach(result => axeRuleIds.add(result.id));
    }
    axeRuleIds.add('color-contrast');
    const axeRuleIdsArr = Array.from(axeRuleIds).sort();

    // Note: audit ids match their filenames, thx to the getAuditList test in runner-test.js
    const filenames = fs.readdirSync(__dirname + '/../../../audits/accessibility/')
        .map(f => f.replace('.js', '')).filter(f => f !== 'axe-audit' && f !== 'manual')
        .sort();

    expect(axeRuleIdsArr).toEqual(filenames);
  });
});
