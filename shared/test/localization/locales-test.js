/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {locales} from '../../localization/locales.js';

describe('locales', () => {
  it('has only canonical (or expected-deprecated) language tags', () => {
    // Map of deprecated codes to their canonical version. Depending on the ICU
    // version used to run Lighthouse/this test, these *may* come back as their
    // substitute, not themselves.
    const deprecatedCodes = {
      in: 'id',
      iw: 'he',
      mo: 'ro',
      tl: 'fil',
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
