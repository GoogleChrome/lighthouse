/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const locales = require('../../../lib/i18n/locales.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('locales', () => {
  it('has only canonical (or expected-deprecated) language tags', () => {
    // Map of deprecated codes to their canonical version. Depending on the ICU
    // version used to run Lighthouse/this test, these *may* come back as their
    // substitute, not themselves.
    const deprecatedCodes = {
      in: 'id',
      iw: 'he',
      mo: 'ro',
    };

    for (const locale of Object.keys(locales)) {
      const canonicalLocale = Intl.getCanonicalLocales(locale)[0];
      const substitute = deprecatedCodes[locale];
      assert.ok(locale === canonicalLocale || substitute === canonicalLocale,
        `locale code '${locale}' not canonical ('${canonicalLocale}' found instead)`);
    }

    // Deprecation subsitutes should be removed from the test if no longer used.
    for (const locale of Object.keys(deprecatedCodes)) {
      assert.ok(locales[locale], `${locale} substitute should be removed from test`);
    }
  });

  it('has a base language prefix fallback for all supported languages', () => {
    for (const locale of Object.keys(locales)) {
      const basePrefix = locale.split('-')[0];
      // The internet sez there is no canonical Chinese, so we exclude that one.
      if (basePrefix !== 'zh') {
        assert.ok(locales[basePrefix], `${locale} is missing a base fallback`);
      }
    }
  });
});
