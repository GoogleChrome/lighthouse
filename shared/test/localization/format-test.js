/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';

import * as i18n from '../../../core/lib/i18n/i18n.js';
import * as constants from '../../../core/config/constants.js';
import * as format from '../../localization/format.js';
import {locales} from '../../localization/locales.js';
import {getModuleDirectory, getModulePath} from '../../esm-utils.js';
import {LH_ROOT} from '../../root.js';

const moduleDir = getModuleDirectory(import.meta);
const modulePath = getModulePath(import.meta);

describe('format', () => {
  describe('DEFAULT_LOCALE', () => {
    it('is the same as the default config locale', () => {
      expect(format.DEFAULT_LOCALE).toBe(constants.defaultSettings.locale);
    });
  });

  describe('#getAvailableLocales', () => {
    it('has all the available locales', () => {
      const availableLocales = format.getAvailableLocales();
      for (const locale of ['en', 'es', 'ru', 'zh']) {
        expect(availableLocales).toContain(locale);
      }

      const rawLocales = Object.keys(locales).sort();
      expect(availableLocales.sort()).toEqual(rawLocales);
    });

    it('contains the default locale', () => {
      expect(format.getAvailableLocales()).toContain(format.DEFAULT_LOCALE);
    });
  });

  describe('#getCanonicalLocales', () => {
    it('contains some canonical locales', () => {
      const canonicalLocales = format.getCanonicalLocales();
      for (const locale of ['en-US', 'es', 'ru', 'zh']) {
        expect(canonicalLocales).toContain(locale);
      }
    });

    it('is a subset of the available locales', () => {
      const canonicalLocales = format.getCanonicalLocales();
      const availableLocales = format.getAvailableLocales();

      for (const canonicalLocale of canonicalLocales) {
        expect(availableLocales).toContain(canonicalLocale);
      }

      expect(canonicalLocales.length).toBeLessThan(availableLocales.length);
    });
  });

  describe('#_formatPathAsString', () => {
    it('handles simple paths', () => {
      expect(format._formatPathAsString(['foo'])).toBe('foo');
      expect(format._formatPathAsString(['foo', 'bar', 'baz'])).toBe('foo.bar.baz');
    });

    it('handles array paths', () => {
      expect(format._formatPathAsString(['foo', 0])).toBe('foo[0]');
    });

    it('handles complex paths', () => {
      const propertyPath = ['foo', 'what-the', 'bar', 0, 'no'];
      expect(format._formatPathAsString(propertyPath)).toBe('foo[what-the].bar[0].no');
    });

    it('throws on unhandleable paths', () => {
      expect(() => format._formatPathAsString(['Bobby "DROP TABLE'])).toThrow(/Cannot handle/);
    });
  });

  describe('#replaceIcuMessages', () => {
    it('replaces the references in the LHR', () => {
      const fakeFile = path.join(moduleDir, 'fake-file-number-2.js');
      const UIStrings = {aString: 'different {x}!'};
      const formatter = i18n.createIcuMessageFn(fakeFile, UIStrings);

      const title = formatter(UIStrings.aString, {x: 1});
      const lhr = {audits: {'fake-audit': {title}}};

      const icuMessagePaths = format.replaceIcuMessages(lhr, 'en-US');
      expect(lhr.audits['fake-audit'].title).toBe('different 1!');

      const expectedPathId = 'shared/test/localization/fake-file-number-2.js | aString';
      expect(icuMessagePaths).toEqual({
        [expectedPathId]: [{path: 'audits[fake-audit].title', values: {x: 1}}]});
    });
  });

  describe('#getRendererFormattedStrings', () => {
    it('returns icu messages in the specified locale', () => {
      const strings = format.getRendererFormattedStrings('en-XA');
      expect(strings.passedAuditsGroupTitle).toEqual('[Þåššéð åûðîţš one two]');
      expect(strings.snippetCollapseButtonLabel).toEqual('[Çöļļåþšé šñîþþéţ one two]');
    });

    it('throws an error for invalid locales', () => {
      expect(_ => format.getRendererFormattedStrings('not-a-locale'))
        .toThrow(`Unsupported locale 'not-a-locale'`);
    });
  });

  describe('#getFormatted', () => {
    it('returns the formatted string', () => {
      const UIStrings = {testMessage: 'happy test'};
      const str_ = i18n.createIcuMessageFn(modulePath, UIStrings);
      const formattedStr = format.getFormatted(str_(UIStrings.testMessage), 'en');
      expect(formattedStr).toEqual('happy test');
    });

    it('returns the formatted string with replacements', () => {
      const UIStrings = {testMessage: 'replacement test ({errorCode})'};
      const str_ = i18n.createIcuMessageFn(modulePath, UIStrings);
      const formattedStr = format.getFormatted(str_(UIStrings.testMessage,
          {errorCode: 'BOO'}), 'en');
      expect(formattedStr).toEqual('replacement test (BOO)');
    });

    it('throws an error for invalid locales', () => {
      // Populate a string to try to localize to a bad locale.
      const UIStrings = {testMessage: 'testy test'};
      const str_ = i18n.createIcuMessageFn(modulePath, UIStrings);

      expect(_ => format.getFormatted(str_(UIStrings.testMessage), 'still-not-a-locale'))
        .toThrow(`Unsupported locale 'still-not-a-locale'`);
    });

    it('does not alter the passed-in replacement values object', () => {
      const UIStrings = {
        testMessage: 'needs {count, number, bytes}KB test {str} in {timeInMs, number, seconds}s',
      };
      const str_ = i18n.createIcuMessageFn(modulePath, UIStrings);

      const replacements = {
        count: 2555,
        str: '*units*',
        timeInMs: 314159265,
      };
      const replacementsClone = JSON.parse(JSON.stringify(replacements));

      const formattedStr = format.getFormatted(str_(UIStrings.testMessage, replacements), 'en');
      expect(formattedStr).toEqual('needs 2KB test *units* in 314,159.3s');

      expect(replacements).toEqual(replacementsClone);
    });

    it('returns a message that is already a string unchanged', () => {
      const testString = 'kind of looks like it needs ({formatting})';
      const formattedStr = format.getFormatted(testString, 'pl');
      expect(formattedStr).toBe(testString);
    });

    it('throws an error if formatting something other than IcuMessages or strings', () => {
      expect(_ => format.getFormatted(15, 'lt'))
        .toThrow(`Attempted to format invalid icuMessage type`);
      expect(_ => format.getFormatted(new Date(), 'sr-Latn'))
        .toThrow(`Attempted to format invalid icuMessage type`);
    });
  });

  describe('#registerLocaleData', () => {
    // Store original locale data so we can restore at the end
    const clonedLocales = JSON.parse(JSON.stringify(locales));

    it('installs new locale strings', () => {
      const localeData = {
        'shared/test/localization/format-test.js | testString': {
          'message': 'en-XZ cuerda!',
        },
      };
      format.registerLocaleData('en-XZ', localeData);

      const UIStrings = {testString: 'en-US string!'};
      const str_ = i18n.createIcuMessageFn(modulePath, UIStrings);
      const formattedStr = format.getFormatted(str_(UIStrings.testString), 'en-XZ');
      expect(formattedStr).toEqual('en-XZ cuerda!');
    });

    [
      {label: 'relative path', filename: 'core/audits/is-on-https.js'},
      {label: 'absolute path', filename: `${LH_ROOT}/core/audits/is-on-https.js`},
    ].forEach(({label, filename}) => {
      it(`overwrites existing locale strings: ${label}`, async () => {
        const {UIStrings} = await import('../../../core/audits/is-on-https.js');
        const str_ = i18n.createIcuMessageFn(filename, UIStrings);

        // To start with, we get back the intended string..
        const origTitle = format.getFormatted(str_(UIStrings.title), 'es-419');
        expect(origTitle).toEqual('Usa HTTPS');
        const origFailureTitle = format.getFormatted(str_(UIStrings.failureTitle), 'es-419');
        expect(origFailureTitle).toEqual('No usa HTTPS');

        // Now we declare and register the new string...
        const localeData = {
          'core/audits/is-on-https.js | title': {
            'message': 'new string for es-419 uses https!',
          },
        };
        format.registerLocaleData('es-419', localeData);

        // And confirm that's what is returned
        const newTitle = format.getFormatted(str_(UIStrings.title), 'es-419');
        expect(newTitle).toEqual('new string for es-419 uses https!');

        // Meanwhile another string that wasn't set in registerLocaleData just falls back to english
        const newFailureTitle = format.getFormatted(str_(UIStrings.failureTitle), 'es-419');
        expect(newFailureTitle).toEqual('Does not use HTTPS');

        // Restore overwritten strings to avoid messing with other tests
        locales['es-419'] = clonedLocales['es-419'];
        const title = format.getFormatted(str_(UIStrings.title), 'es-419');
        expect(title).toEqual('Usa HTTPS');
      });
    });
  });

  describe('#isIcuMessage', () => {
    const icuMessage = {
      i18nId: 'shared/test/localization/fake-file.js | title',
      values: {x: 1},
      formattedDefault: 'a default',
    };

    it('passes a valid LH.IcuMessage', () => {
      expect(format.isIcuMessage(icuMessage)).toBe(true);
    });

    it('fails non-objects', () => {
      expect(format.isIcuMessage(undefined)).toBe(false);
      expect(format.isIcuMessage(null)).toBe(false);
      expect(format.isIcuMessage('ICU!')).toBe(false);
      expect(format.isIcuMessage(55)).toBe(false);
      expect(format.isIcuMessage([
        icuMessage,
        icuMessage,
      ])).toBe(false);
    });

    it('fails invalid or missing i18nIds', () => {
      const badIdMessage = {...icuMessage, i18nId: 0};
      expect(format.isIcuMessage(badIdMessage)).toBe(false);

      const noIdMessage = {...icuMessage};
      delete noIdMessage.i18nId;
      expect(format.isIcuMessage(noIdMessage)).toBe(false);
    });

    it('fails invalid or missing formattedDefault', () => {
      const badDefaultMessage = {...icuMessage, formattedDefault: -0};
      expect(format.isIcuMessage(badDefaultMessage)).toBe(false);

      const noDefaultMessage = {...icuMessage};
      delete noDefaultMessage.formattedDefault;
      expect(format.isIcuMessage(noDefaultMessage)).toBe(false);
    });

    it('passes missing values', () => {
      const emptyValuesMessage = {...icuMessage, values: {}};
      expect(format.isIcuMessage(emptyValuesMessage)).toBe(true);

      const noValuesMessage = {...icuMessage};
      delete noValuesMessage.values;
      expect(format.isIcuMessage(noValuesMessage)).toBe(true);
    });

    it('fails invalid values types', () => {
      const badValuesMessage = {...icuMessage, values: NaN};
      expect(format.isIcuMessage(badValuesMessage)).toBe(false);
      const nullValuesMessage = {...icuMessage, values: null};
      expect(format.isIcuMessage(nullValuesMessage)).toBe(false);
    });

    it(`fails invalid values' values types`, () => {
      const badValuesValuesMessage = {...icuMessage, values: {a: false}};
      expect(format.isIcuMessage(badValuesValuesMessage)).toBe(false);
    });
  });

  describe('#getIcuMessageIdParts', () => {
    it('returns valid ICU message id parts', () => {
      const {filename, key} = format.getIcuMessageIdParts('path/to/file.js | modeName');
      expect(filename).toEqual('path/to/file.js');
      expect(key).toEqual('modeName');
    });

    it('throws on invalid ICU message id', () => {
      expect(() => {
        format.getIcuMessageIdParts('path/to/file.js');
      }).toThrow();
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

    let str_;
    before(() => {
      str_ = i18n.createIcuMessageFn(modulePath, UIStrings);
    });

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
      expect(_ => format.getFormatted(str_(UIStrings.helloBytesWorld), 'en-US'))
        // eslint-disable-next-line max-len
        .toThrow(`ICU Message "Hello {in, number, bytes} World" contains a value reference ("in") that wasn't provided`);
    });

    it('throws an error when a value is missing', () => {
      expect(_ => format.getFormatted(str_(UIStrings.helloWorldMultiReplace,
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
      expect(_ => str_(UIStrings.helloTimeInMsWorld, {
        timeInMs: 'string not a number',
      }))
        // eslint-disable-next-line max-len
        .toThrow(`ICU Message "Hello {timeInMs, number, seconds} World" contains a numeric reference ("timeInMs") but provided value was not a number`);
    });

    it('throws an error if a value is provided that has no placeholder in the message', () => {
      expect(_ => str_(UIStrings.helloTimeInMsWorld, {
        timeInMs: 55,
        sirNotAppearingInThisString: 66,
      }))
        // eslint-disable-next-line max-len
        .toThrow(`Provided value "sirNotAppearingInThisString" does not match any placeholder in ICU message "Hello {timeInMs, number, seconds} World"`);
    });

    it('throws an error if a value is provided for a message with no placeholders', () => {
      expect(_ => str_(UIStrings.helloWorld, {
        extraCreditValue: 100,
      }))
        // eslint-disable-next-line max-len
        .toThrow(`Provided value "extraCreditValue" does not match any placeholder in ICU message "Hello World"`);
    });

    it('formats correctly with NaN and Infinity numeric values', () => {
      const helloInfinityStr = str_(UIStrings.helloBytesWorld, {in: Infinity});
      expect(helloInfinityStr).toBeDisplayString('Hello ∞ World');

      const helloNaNStr = str_(UIStrings.helloBytesWorld, {in: NaN});
      expect(helloNaNStr).toBeDisplayString('Hello NaN World');
    });
  });
});
