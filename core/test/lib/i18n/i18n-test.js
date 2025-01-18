/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';

import log from 'lighthouse-logger';
import jestMock from 'jest-mock';

import * as i18n from '../../../lib/i18n/i18n.js';
import {getModuleDirectory} from '../../../../shared/esm-utils.js';

const moduleDir = getModuleDirectory(import.meta);

describe('i18n', () => {
  describe('#createIcuMessageFn', () => {
    it('returns an IcuMessage reference', () => {
      const fakeFile = path.join(moduleDir, 'fake-file.js');
      const templates = {daString: 'use {x} me!'};
      const formatter = i18n.createIcuMessageFn(fakeFile, templates);

      expect(formatter(templates.daString, {x: 1})).toStrictEqual({
        i18nId: 'core/test/lib/i18n/fake-file.js | daString',
        values: {x: 1},
        formattedDefault: 'use 1 me!',
      });
    });
  });

  describe('#lookupLocale', () => {
    const invalidLocale = 'jk-Latn-DE-1996-a-ext-x-phonebk-i-klingon';

    it('canonicalizes the locale', () => {
      expect(i18n.lookupLocale('en-xa')).toEqual('en-XA');
    });

    it('takes multiple locale strings and returns a canonical one', () => {
      expect(i18n.lookupLocale([invalidLocale, 'en-xa'])).toEqual('en-XA');
    });

    it('falls back to default if locale not provided or cant be found', () => {
      expect(i18n.lookupLocale(undefined)).toEqual('en-US');
      expect(i18n.lookupLocale(invalidLocale)).toEqual('en-US');
      expect(i18n.lookupLocale([invalidLocale, invalidLocale])).toEqual('en-US');
    });

    it('logs a warning if locale is not available and the default is used', () => {
      const logListener = jestMock.fn();
      log.events.on('warning', logListener);

      expect(i18n.lookupLocale(invalidLocale)).toEqual('en-US');

      expect(logListener).toBeCalledTimes(1);
      expect(logListener).toBeCalledWith(['i18n',
        `locale(s) '${invalidLocale}' not available. Falling back to default 'en-US'`]);

      log.events.off('warning', logListener);
    });

    it('falls back to root tag prefix if specific locale not available', () => {
      expect(i18n.lookupLocale('es-JKJK')).toEqual('es');
    });

    it('falls back to en-US if no match is available', () => {
      expect(i18n.lookupLocale(invalidLocale)).toEqual('en-US');
    });

    describe('possibleLocales option', () => {
      it('canonicalizes from the possible locales', () => {
        expect(i18n.lookupLocale('en-xa', ['ar', 'en-XA'])).toEqual('en-XA');
      });

      it('takes multiple locale strings and returns a possible, canonicalized one', () => {
        expect(i18n.lookupLocale([invalidLocale, 'eS', 'en-xa'], ['ar', 'es']))
            .toEqual('es');
      });

      it('falls back to en-US if no possible match is available', () => {
        expect(i18n.lookupLocale('es', ['en-US', 'ru', 'zh'])).toEqual('en-US');
      });

      it('falls back to en-US if no possible matchs are available at all', () => {
        expect(i18n.lookupLocale('ru', [])).toEqual('en-US');
      });
    });
  });
});
