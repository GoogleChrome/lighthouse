/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {swapLocale} from '../../localization/swap-locale.js';
import {readJson} from '../../../core/test/test-utils.js';

const lhr = readJson('core/test/results/sample_v2.json');

describe('swap-locale', () => {
  it('does not mutate the original lhr', () => {
    /** @type {LH.Result} */
    const lhrClone = JSON.parse(JSON.stringify(lhr));

    const lhrPt = swapLocale(lhr, 'pt').lhr;
    expect(lhrPt).not.toStrictEqual(lhr);
    expect(lhr).toStrictEqual(lhrClone);
  });

  it('can change golden LHR english strings into german', () => {
    /** @type {LH.Result} */
    const lhrEn = JSON.parse(JSON.stringify(lhr));
    const lhrDe = swapLocale(lhrEn, 'de').lhr;

    // Basic replacement
    expect(lhrEn.audits['viewport'].title).toEqual(
      'Has a `<meta name="viewport">` tag with `width` or `initial-scale`');
    expect(lhrDe.audits['viewport'].title).toEqual(
      'Hat ein `<meta name="viewport">`-Tag mit `width` oder `initial-scale`');

    // With ICU string argument values
    expect(lhrEn.audits['dom-size'].displayValue).toMatchInlineSnapshot(`"151 elements"`);
    /* eslint-disable no-irregular-whitespace */
    expect(lhrDe.audits['dom-size'].displayValue).toMatchInlineSnapshot(`"151 Elemente"`);

    // Renderer formatted strings
    expect(lhrEn.i18n.rendererFormattedStrings.labDataTitle).toEqual('Lab Data');
    expect(lhrDe.i18n.rendererFormattedStrings.labDataTitle).toEqual('Labdaten');

    // Formatted numbers in placeholders.
    expect(lhrEn.audits['mainthread-work-breakdown'].displayValue).
toMatchInlineSnapshot(`"2.7 s"`);
    expect(lhrDe.audits['mainthread-work-breakdown'].displayValue).
toMatchInlineSnapshot(`"2,7 s"`);
    /* eslint-enable no-irregular-whitespace */
  });

  it('can roundtrip back to english correctly', () => {
    /** @type {LH.Result} */
    const lhrEn = JSON.parse(JSON.stringify(lhr));

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
          doesntExist: 'A string that does not have localized versions',
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
          'core/audits/redirects.js | title': ['audits.redirects.title'],
          // File that exists, but `doesntExist` message within it does not.
          'core/audits/redirects.js | doesntExist': ['audits.redirects.doesntExist'],
          // File and message which do not exist.
          'core/audits/fakeaudit.js | title': ['audits.fakeaudit.title'],
        },
      },
    };
    const {missingIcuMessageIds} = swapLocale(miniLHR, 'es');

    // Updated strings are not found, so these remain in the original language
    expect(missingIcuMessageIds).toMatchInlineSnapshot(`
Array [
  "core/audits/redirects.js | doesntExist",
  "core/audits/fakeaudit.js | title",
]
`);
  });

  it('does not change properties that are not strings', () => {
    // Unlikely, but possible e.g. if an audit details changed shape over LH versions.
    const miniLhr = {
      audits: {
        redirects: {
          id: 'redirects',
          title: 'Avoid multiple page redirects',
        },
      },
      configSettings: {
        locale: 'en-US',
      },
      i18n: {
        icuMessagePaths: {
          // Points to audit object, not string.
          'core/audits/redirects.js | title': ['audits.redirects'],
          // Path does not point to anything in LHR.
          'core/audits/redirects.js | description': ['gatherers..X'],
        },
      },
    };
    const testLocale = 'ru';
    const {lhr} = swapLocale(miniLhr, testLocale);

    // LHR remains unchanged except for locale and injected `rendererFormattedStrings`.
    miniLhr.configSettings.locale = testLocale;
    miniLhr.i18n.rendererFormattedStrings = expect.any(Object);
    expect(lhr).toEqual(miniLhr);
  });
});
