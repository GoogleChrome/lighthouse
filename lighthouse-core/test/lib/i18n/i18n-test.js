/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const i18n = require('../../../lib/i18n/i18n.js');

/* eslint-env jest */

describe('i18n', () => {
  describe('#_formatPathAsString', () => {
    it('handles simple paths', () => {
      expect(i18n._formatPathAsString(['foo'])).toBe('foo');
      expect(i18n._formatPathAsString(['foo', 'bar', 'baz'])).toBe('foo.bar.baz');
    });

    it('handles array paths', () => {
      expect(i18n._formatPathAsString(['foo', 0])).toBe('foo[0]');
    });

    it('handles complex paths', () => {
      const propertyPath = ['foo', 'what-the', 'bar', 0, 'no'];
      expect(i18n._formatPathAsString(propertyPath)).toBe('foo[what-the].bar[0].no');
    });

    it('throws on unhandleable paths', () => {
      expect(() => i18n._formatPathAsString(['Bobby "DROP TABLE'])).toThrow(/Cannot handle/);
    });
  });

  describe('#createMessageInstanceIdFn', () => {
    it('returns a string reference', () => {
      const fakeFile = path.join(__dirname, 'fake-file.js');
      const templates = {daString: 'use me!'};
      const formatter = i18n.createMessageInstanceIdFn(fakeFile, templates);

      const expected = 'lighthouse-core/test/lib/i18n/fake-file.js | daString # 0';
      expect(formatter(templates.daString, {x: 1})).toBe(expected);
    });
  });

  describe('#replaceIcuMessageInstanceIds', () => {
    it('replaces the references in the LHR', () => {
      const fakeFile = path.join(__dirname, 'fake-file-number-2.js');
      const UIStrings = {aString: 'different {x}!'};
      const formatter = i18n.createMessageInstanceIdFn(fakeFile, UIStrings);

      const title = formatter(UIStrings.aString, {x: 1});
      const lhr = {audits: {'fake-audit': {title}}};

      const icuMessagePaths = i18n.replaceIcuMessageInstanceIds(lhr, 'en-US');
      expect(lhr.audits['fake-audit'].title).toBe('different 1!');

      const expectedPathId = 'lighthouse-core/test/lib/i18n/fake-file-number-2.js | aString';
      expect(icuMessagePaths).toEqual({
        [expectedPathId]: [{path: 'audits[fake-audit].title', values: {x: 1}}]});
    });
  });

  describe('#getRendererFormattedStrings', () => {
    it('returns icu messages in the specified locale', () => {
      const strings = i18n.getRendererFormattedStrings('en-XA');
      expect(strings.passedAuditsGroupTitle).toEqual('[Þåššéð åûðîţš one two]');
      expect(strings.snippetCollapseButtonLabel).toEqual('[Çöļļåþšé šñîþþéţ one two]');
    });

    it('throws an error for invalid locales', () => {
      expect(_ => i18n.getRendererFormattedStrings('not-a-locale'))
        .toThrow(`Unsupported locale 'not-a-locale'`);
    });
  });

  describe('#getFormatted', () => {
    it('returns the formatted string', () => {
      const UIStrings = {testMessage: 'happy test'};
      const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);
      const formattedStr = i18n.getFormatted(str_(UIStrings.testMessage), 'en');
      expect(formattedStr).toEqual('happy test');
    });

    it('returns the formatted string with replacements', () => {
      const UIStrings = {testMessage: 'replacement test ({errorCode})'};
      const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);
      const formattedStr = i18n.getFormatted(str_(UIStrings.testMessage, {errorCode: 'BOO'}), 'en');
      expect(formattedStr).toEqual('replacement test (BOO)');
    });

    it('throws an error for invalid locales', () => {
      // Populate a string to try to localize to a bad locale.
      const UIStrings = {testMessage: 'testy test'};
      const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

      expect(_ => i18n.getFormatted(str_(UIStrings.testMessage), 'still-not-a-locale'))
        .toThrow(`Unsupported locale 'still-not-a-locale'`);
    });

    it('does not alter the passed-in replacement values object', () => {
      const UIStrings = {
        testMessage: 'needs {count, number, bytes}KB test {str} in {timeInMs, number, seconds}s',
      };
      const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

      const replacements = {
        count: 2555,
        str: '*units*',
        timeInMs: 314159265,
      };
      const replacementsClone = JSON.parse(JSON.stringify(replacements));

      const formattedStr = i18n.getFormatted(str_(UIStrings.testMessage, replacements), 'en');
      expect(formattedStr).toEqual('needs 2KB test *units* in 314,159.3s');

      expect(replacements).toEqual(replacementsClone);
    });
  });

  describe('#lookupLocale', () => {
    it('canonicalizes the locale', () => {
      expect(i18n.lookupLocale('en-xa')).toEqual('en-XA');
    });

    it('falls back to root tag prefix if specific locale not available', () => {
      expect(i18n.lookupLocale('en-JKJK')).toEqual('en');
    });

    it('falls back to en if no match is available', () => {
      expect(i18n.lookupLocale('jk-Latn-DE-1996-a-ext-x-phonebk-i-klingon')).toEqual('en');
    });
  });

  describe('#registerLocaleData', () => {
    // Store original locale data so we can restore at the end
    const moduleLocales = require('../../../lib/i18n/locales.js');
    const clonedLocales = JSON.parse(JSON.stringify(moduleLocales));

    it('installs new locale strings', () => {
      const localeData = {
        'lighthouse-core/test/lib/i18n/i18n-test.js | testString': {
          'message': 'en-XZ cuerda!',
        },
      };
      i18n.registerLocaleData('en-XZ', localeData);

      const UIStrings = {testString: 'en-US string!'};
      const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);
      const formattedStr = i18n.getFormatted(str_(UIStrings.testString), 'en-XZ');
      expect(formattedStr).toEqual('en-XZ cuerda!');
    });

    it('overwrites existing locale strings', () => {
      const filename = 'lighthouse-core/audits/is-on-https.js';
      const UIStrings = require('../../../../lighthouse-core/audits/is-on-https.js').UIStrings;
      const str_ = i18n.createMessageInstanceIdFn(filename, UIStrings);

      // To start with, we get back the intended string..
      const origTitle = i18n.getFormatted(str_(UIStrings.title), 'es-419');
      expect(origTitle).toEqual('Usa HTTPS');
      const origFailureTitle = i18n.getFormatted(str_(UIStrings.failureTitle), 'es-419');
      expect(origFailureTitle).toEqual('No usa HTTPS');

      // Now we declare and register the new string...
      const localeData = {
        'lighthouse-core/audits/is-on-https.js | title': {
          'message': 'new string for es-419 uses https!',
        },
      };
      i18n.registerLocaleData('es-419', localeData);

      // And confirm that's what is returned
      const newTitle = i18n.getFormatted(str_(UIStrings.title), 'es-419');
      expect(newTitle).toEqual('new string for es-419 uses https!');

      // Meanwhile another string that wasn't set in registerLocaleData just falls back to english
      const newFailureTitle = i18n.getFormatted(str_(UIStrings.failureTitle), 'es-419');
      expect(newFailureTitle).toEqual('Does not use HTTPS');

      // Restore overwritten strings to avoid messing with other tests
      moduleLocales['es-419'] = clonedLocales['es-419'];
      const title = i18n.getFormatted(str_(UIStrings.title), 'es-419');
      expect(title).toEqual('Usa HTTPS');
    });
  });

  describe('Message values are properly formatted', () => {
    // Message strings won't be in locale files, so will fall back to values given here.
    const UIStrings = {
      helloWorld: 'Hello World',
      helloBytesWorld: 'Hello {in, number, bytes} World',
      helloMsWorld: 'Hello {in, number, milliseconds} World',
      helloSecWorld: 'Hello {in, number, seconds} World',
      helloTimeInMsWorld: 'Hello {timeInMs, number, seconds} World',
      helloPercentWorld: 'Hello {in, number, extendedPercent} World',
      helloWorldMultiReplace: '{hello} {world}',
      helloPlural: '{itemCount, plural, =1{1 hello} other{hellos}}',
      helloPluralNestedICU: '{itemCount, plural, ' +
        '=1{1 hello {in, number, bytes}} ' +
        'other{hellos {in, number, bytes}}}',
      helloPluralNestedPluralAndICU: '{itemCount, plural, ' +
        '=1{{innerItemCount, plural, ' +
          '=1{1 hello 1 goodbye {in, number, bytes}} ' +
          'other{1 hello, goodbyes {in, number, bytes}}}} ' +
        'other{{innerItemCount, plural, ' +
          '=1{hellos 1 goodbye {in, number, bytes}} ' +
          'other{hellos, goodbyes {in, number, bytes}}}}}',
    };
    const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

    it('formats a basic message', () => {
      const helloStr = str_(UIStrings.helloWorld);
      expect(helloStr).toBeDisplayString('Hello World');
    });

    it('formats a message with bytes', () => {
      const helloBytesStr = str_(UIStrings.helloBytesWorld, {in: 1875});
      expect(helloBytesStr).toBeDisplayString('Hello 2 World');
    });

    it('formats a message with milliseconds', () => {
      const helloMsStr = str_(UIStrings.helloMsWorld, {in: 432});
      expect(helloMsStr).toBeDisplayString('Hello 430 World');
    });

    it('formats a message with seconds', () => {
      const helloSecStr = str_(UIStrings.helloSecWorld, {in: 753});
      expect(helloSecStr).toBeDisplayString('Hello 753.0 World');
    });

    it('formats a message with seconds timeInMs', () => {
      const helloTimeInMsStr = str_(UIStrings.helloTimeInMsWorld, {timeInMs: 753543});
      expect(helloTimeInMsStr).toBeDisplayString('Hello 753.5 World');
    });

    it('formats a message with extended percent', () => {
      const helloPercentStr = str_(UIStrings.helloPercentWorld, {in: 0.43078});
      expect(helloPercentStr).toBeDisplayString('Hello 43.08% World');
    });

    it('throws an error when values are needed but not provided', () => {
      expect(_ => i18n.getFormatted(str_(UIStrings.helloBytesWorld), 'en-US'))
        // eslint-disable-next-line max-len
        .toThrow(`ICU Message "Hello {in, number, bytes} World" contains a value reference ("in") that wasn't provided`);
    });

    it('throws an error when a value is missing', () => {
      expect(_ => i18n.getFormatted(str_(UIStrings.helloWorldMultiReplace,
        {hello: 'hello'}), 'en-US'))
        // eslint-disable-next-line max-len
        .toThrow(`ICU Message "{hello} {world}" contains a value reference ("world") that wasn't provided`);
    });

    it('formats a message with plurals', () => {
      const helloStr = str_(UIStrings.helloPlural, {itemCount: 3});
      expect(helloStr).toBeDisplayString('hellos');
    });

    it('throws an error when a plural control value is missing', () => {
      expect(_ => i18n.getFormatted(str_(UIStrings.helloPlural), 'en-US'))
        // eslint-disable-next-line max-len
        .toThrow(`ICU Message "{itemCount, plural, =1{1 hello} other{hellos}}" contains a value reference ("itemCount") that wasn't provided`);
    });

    it('formats a message with plurals and nested custom ICU', () => {
      const helloStr = str_(UIStrings.helloPluralNestedICU, {itemCount: 3, in: 1875});
      expect(helloStr).toBeDisplayString('hellos 2');
    });

    it('formats a message with plurals and nested custom ICU and nested plural', () => {
      const helloStr = str_(UIStrings.helloPluralNestedPluralAndICU, {itemCount: 3,
        innerItemCount: 1,
        in: 1875});
      expect(helloStr).toBeDisplayString('hellos 1 goodbye 2');
    });

    it('throws an error if a string value is used for a numeric placeholder', () => {
      const helloStr = str_(UIStrings.helloTimeInMsWorld, {
        timeInMs: 'string not a number',
      });
      expect(_ => i18n.getFormatted(helloStr, 'en-US'))
        // eslint-disable-next-line max-len
        .toThrow(`ICU Message "Hello {timeInMs, number, seconds} World" contains a numeric reference ("timeInMs") but provided value was not a number`);
    });

    it('throws an error if a value is provided that has no placeholder in the message', () => {
      const helloStr = str_(UIStrings.helloTimeInMsWorld, {
        timeInMs: 55,
        sirNotAppearingInThisString: 66,
      });
      expect(_ => i18n.getFormatted(helloStr, 'en-US'))
        // eslint-disable-next-line max-len
        .toThrow(`Provided value "sirNotAppearingInThisString" does not match any placeholder in ICU message "Hello {timeInMs, number, seconds} World"`);
    });

    it('formats correctly with NaN and Infinity numeric values', () => {
      const helloInfinityStr = str_(UIStrings.helloBytesWorld, {in: Infinity});
      expect(helloInfinityStr).toBeDisplayString('Hello ∞ World');

      const helloNaNStr = str_(UIStrings.helloBytesWorld, {in: NaN});
      // TODO(COMPAT): workaround can be removed after Node 13 is retired.
      // expect(helloNaNStr).toBeDisplayString('Hello NaN World');

      // Node 13/V8 7.9 and 8.0 have a bug where `({a: NaN}).a.toLocaleString() === "-NaN"`. It
      // works correctly in Node 12 and 14, so work around it since NaN isn't essential for
      // user-facing strings and it will eventually correct itself.
      const formattedNaNStr = i18n.getFormatted(helloNaNStr, 'en-US');
      expect(formattedNaNStr === 'Hello NaN World' || formattedNaNStr === 'Hello -NaN World')
        .toBe(true);
    });
  });
});
