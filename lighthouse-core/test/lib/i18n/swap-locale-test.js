/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const swapLocale = require('../../../lib/i18n/swap-locale.js');

const lhr = require('../../results/sample_v2.json');

/* eslint-env jest */
describe('swap-locale', () => {
  it('can change golden LHR english strings into german', () => {
    const lhrEn = /** @type {LH.Result} */ (JSON.parse(JSON.stringify(lhr)));
    const lhrDe = swapLocale(lhrEn, 'de').lhr;

    // Basic replacement
    expect(lhrEn.audits.plugins.title).toEqual('Document avoids plugins');
    expect(lhrDe.audits.plugins.title).toEqual('Dokument verwendet keine Plug-ins');

    // With ICU string argument values
    expect(lhrEn.audits['dom-size'].displayValue).toEqual('31 elements');
    expect(lhrDe.audits['dom-size'].displayValue).toEqual('31 Elemente');

    // Renderer formatted strings
    expect(lhrEn.i18n.rendererFormattedStrings.labDataTitle).toEqual('Lab Data');
    expect(lhrDe.i18n.rendererFormattedStrings.labDataTitle).toEqual('Labdaten');

    // Formatted numbers in placeholders.
    expect(lhrEn.audits['render-blocking-resources'].displayValue)
      .toEqual('Potential savings of 1,130 ms');
    expect(lhrDe.audits['render-blocking-resources'].displayValue)
      .toEqual('Mögliche Einsparung von 1.130 ms');
  });

  it('can roundtrip back to english correctly', () => {
    const lhrEn = /** @type {LH.Result} */ (JSON.parse(JSON.stringify(lhr)));

    // via Spanish
    const lhrEnEsRT = swapLocale(swapLocale(lhrEn, 'es').lhr, 'en-US').lhr;
    expect(lhrEnEsRT).toEqual(lhrEn);

    // via Arabic
    const lhrEnArRT = swapLocale(swapLocale(lhrEn, 'ar').lhr, 'en-US').lhr;
    expect(lhrEnArRT).toEqual(lhrEn);
  });

  it('leaves alone messages where there is no translation available', () => {
    const miniLHR = {
      audits: {
        redirects: {
          id: 'redirects',
          title: 'Avoid multiple page redirects',
        },
        fakeaudit: {
          id: 'fakeaudit',
          title: 'An audit without translations',
        },
      },
      configSettings: {
        locale: 'en-US',
      },
      i18n: {
        icuMessagePaths: {
          'lighthouse-core/audits/redirects.js | title': ['audits.redirects.title'],
          'lighthouse-core/audits/redirects.js | doesntExist': ['audits.redirects.doesntExist'],
          'lighthouse-core/audits/fakeaudit.js | title': ['audits.fakeaudit.title'],
        },
      },
    };
    const {missingIcuMessageIds} = swapLocale(miniLHR, 'es');

    // Updated strings are not found, so these remain in the original language
    expect(missingIcuMessageIds).toMatchInlineSnapshot(`
Array [
  "lighthouse-core/audits/redirects.js | doesntExist",
  "lighthouse-core/audits/fakeaudit.js | title",
]
`);
  });
});
