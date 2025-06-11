/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import IntlMessageFormat from 'intl-messageformat';

import {getModuleDirectory} from '../esm-utils.js';
import {isObjectOfUnknownValues, isObjectOrArrayOfUnknownValues} from '../type-verifiers.js';
import {locales} from './locales.js';

// From @formatjs/icu-messageformat-parser - copy here so we don't need to bundle all that.
const TYPE = /** @type {const} */ ({
  literal: 0,
  argument: 1,
  number: 2,
  date: 3,
  time: 4,
  select: 5,
  plural: 6,
  pound: 7,
  tag: 8,
});

const moduleDir = getModuleDirectory(import.meta);

/** Contains available locales with messages. May be an empty object if bundled. */
const LOCALE_MESSAGES = locales;

const DEFAULT_LOCALE = 'en-US';

/**
 * The locale tags for the localized messages available to Lighthouse on disk.
 * When bundled, these will be inlined by `inline-fs`.
 * These locales are considered the "canonical" locales. We support other locales which
 * are simply aliases to one of these. ex: es-AR (alias) -> es-419 (canonical)
 */
const CANONICAL_LOCALES = fs.readdirSync(moduleDir + '/locales/')
  .filter(basename => basename.endsWith('.json') && !basename.endsWith('.ctc.json'))
  .map(locale => locale.replace('.json', ''))
  .sort();

/** @typedef {import('@formatjs/icu-messageformat-parser').MessageFormatElement} MessageFormatElement */

const MESSAGE_I18N_ID_REGEX = / | [^\s]+$/;

/** @type {Partial<import('intl-messageformat').Formats>} */
const formats = {
  number: {
    bytes: {
      maximumFractionDigits: 0,
    },
    milliseconds: {
      maximumFractionDigits: 0,
    },
    seconds: {
      // Force the seconds to the tenths place for limited output and ease of scanning
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
    extendedPercent: {
      // Force allow up to two digits after decimal place in percentages. (Intl.NumberFormat options)
      maximumFractionDigits: 2,
      style: 'percent',
    },
  },
};

/**
 * Function to retrieve all elements from an ICU message AST that are associated
 * with a named input, like '{varName}' or '{varName, number, bytes}'. This
 * differs from literal message types which are just arbitrary text.
 *
 * This function recursively inspects plural elements for nested elements,
 * but since the output is a Map they are deduplicated.
 * e.g. "=1{hello {icu}} =other{hello {icu}}" will produce one element in the output,
 * with "icu" as its key.
 *
 * TODO: don't do that deduplication because messages within a plural message could be number
 * messages with different styles.
 *
 * @param {Array<MessageFormatElement>} icuElements
 * @param {Map<string, MessageFormatElement>} [customElements]
 * @return {Map<string, MessageFormatElement>}
 */
function collectAllCustomElementsFromICU(icuElements, customElements = new Map()) {
  for (const el of icuElements) {
    if (el.type === TYPE.literal || el.type === TYPE.pound) continue;

    customElements.set(el.value, el);

    // Plurals need to be inspected recursively
    if (el.type === TYPE.plural) {
      // Look at all options of the plural (=1{} =other{}...)
      for (const option of Object.values(el.options)) {
        // Run collections on each option's elements
        collectAllCustomElementsFromICU(option.value, customElements);
      }
    }
  }

  return customElements;
}

/**
 * Returns a copy of the `values` object, with the values formatted based on how
 * they will be used in their icuMessage, e.g. KB or milliseconds. The original
 * object is unchanged.
 * @param {IntlMessageFormat} messageFormatter
 * @param {Readonly<Record<string, string | number>>} values
 * @param {string} lhlMessage Used for clear error logging.
 * @return {Record<string, string | number>}
 */
function _preformatValues(messageFormatter, values = {}, lhlMessage) {
  const customElements = collectAllCustomElementsFromICU(messageFormatter.getAst());

  /** @type {Record<string, string | number>} */
  const formattedValues = {};

  for (const [id, element] of customElements) {
    // Throw an error if a message's value isn't provided
    if (!(id in values)) {
      throw new Error(`ICU Message "${lhlMessage}" contains a value reference ("${id}") ` +
        `that wasn't provided`);
    }

    const value = values[id];

    // Direct `{id}` replacement and non-numeric values need no formatting.
    if (element.type !== TYPE.number) {
      formattedValues[id] = value;
      continue;
    }

    if (typeof value !== 'number') {
      throw new Error(`ICU Message "${lhlMessage}" contains a numeric reference ("${id}") ` +
        'but provided value was not a number');
    }

    // Format values for known styles.
    if (element.style === 'milliseconds') {
      // Round all milliseconds to the nearest 10.
      formattedValues[id] = Math.round(value / 10) * 10;
    } else if (element.style === 'seconds' && id === 'timeInMs') {
      // Convert all seconds to the correct unit (currently only for `timeInMs`).
      formattedValues[id] = Math.round(value / 100) / 10;
    } else if (element.style === 'bytes') {
      // Replace all the bytes with KB.
      formattedValues[id] = value / 1024;
    } else {
      // For all other number styles, the value isn't changed.
      formattedValues[id] = value;
    }
  }

  // Throw an error if a value is provided but has no placeholder in the message.
  for (const valueId of Object.keys(values)) {
    if (valueId in formattedValues) continue;

    // errorCode is a special case always allowed to help LighthouseError ease-of-use.
    if (valueId === 'errorCode') {
      formattedValues.errorCode = values.errorCode;
      continue;
    }

    throw new Error(`Provided value "${valueId}" does not match any placeholder in ` +
      `ICU message "${lhlMessage}"`);
  }

  return formattedValues;
}

/**
 * Our strings were made when \ was the escape character, but now it is '. To avoid churn,
 * let's convert to the new style in memory.
 * @param {string} message
 * @return {string}
 */
function escapeIcuMessage(message) {
  return message
    .replace(/'/g, `''`)
    .replace(/\\{/g, `'{`)
    .replace(/\\}/g, `'}`);
}

/**
 * Format string `message` by localizing `values` and inserting them. `message`
 * is assumed to already be in the given locale.
 * If you need to localize a messagem `getFormatted` is probably what you want.
 * @param {string} message
 * @param {Record<string, string | number>|undefined} values
 * @param {LH.Locale} locale
 * @return {string}
 */
function formatMessage(message, values, locale) {
  message = escapeIcuMessage(message);

  // Parsing and formatting can be slow. Don't attempt if the string can't
  // contain ICU placeholders, in which case formatting is already complete.

  // When using accented english, force the use of a different locale for number formatting.
  const localeForMessageFormat = (locale === 'en-XA' || locale === 'en-XL') ? 'de-DE' : locale;

  // This package is not correctly bundled.
  /** @type {typeof IntlMessageFormat} */
  // @ts-expect-error bundler woes
  const IntlMessageFormatCtor = IntlMessageFormat.IntlMessageFormat || IntlMessageFormat;
  const formatter = new IntlMessageFormatCtor(message, localeForMessageFormat, formats, {
    ignoreTag: true,
  });

  // Preformat values for the message format like KB and milliseconds.
  const valuesForMessageFormat = _preformatValues(formatter, values, message);

  const formattedResult = formatter.format(valuesForMessageFormat);
  // We only format to strings.
  if (typeof formattedResult !== 'string') {
    throw new Error('unexpected formatted result');
  }
  return formattedResult;
}

/**
 * Retrieves the localized version of `icuMessage` and formats with any given
 * value replacements.
 * @param {LH.IcuMessage} icuMessage
 * @param {LH.Locale} locale
 * @return {string}
 */
function _localizeIcuMessage(icuMessage, locale) {
  const localeMessages = _getLocaleMessages(locale);
  const localeMessage = localeMessages[icuMessage.i18nId];

  // Use the DEFAULT_LOCALE fallback (usually the original english message) if we couldn't
  // find a message in the specified locale. Possible reasons:
  //  - string drift between Lighthouse versions
  //  - in a bundle stripped of locale files but running in the DEFAULT_LOCALE
  //  - new strings haven't been updated yet in a local dev run
  // Better to have an english message than no message at all; in some cases it
  // won't even matter.
  if (!localeMessage) {
    return icuMessage.formattedDefault;
  }

  return formatMessage(localeMessage.message, icuMessage.values, locale);
}

/**
 * @param {LH.Locale} locale
 * @return {Record<string, string>}
 */
function getRendererFormattedStrings(locale) {
  const localeMessages = _getLocaleMessages(locale);

  // If `localeMessages` is empty in the bundled and DEFAULT_LOCALE case, this
  // will be empty and the report will fall back to the util UIStrings for these.
  const icuMessageIds = Object.keys(localeMessages)
    .filter(f => f.startsWith('report/renderer/report-utils.js'));
  /** @type {Record<string, string>} */
  const strings = {};
  for (const icuMessageId of icuMessageIds) {
    const {filename, key} = getIcuMessageIdParts(icuMessageId);
    if (!filename.endsWith('report-utils.js')) {
      throw new Error(`Unexpected message: ${icuMessageId}`);
    }

    strings[key] = localeMessages[icuMessageId].message;
  }

  return strings;
}

/**
 * Returns whether `icuMessageOrNot`` is an `LH.IcuMessage` instance.
 * @param {unknown} icuMessageOrNot
 * @return {icuMessageOrNot is LH.IcuMessage}
 */
function isIcuMessage(icuMessageOrNot) {
  if (!isObjectOfUnknownValues(icuMessageOrNot)) {
    return false;
  }

  const {i18nId, values, formattedDefault} = icuMessageOrNot;
  if (typeof i18nId !== 'string') {
    return false;
  }

  // formattedDefault is required.
  if (typeof formattedDefault !== 'string') {
    return false;
  }

  // Values is optional.
  if (values !== undefined) {
    if (!isObjectOfUnknownValues(values)) {
      return false;
    }
    for (const value of Object.values(values)) {
      if (typeof value !== 'string' && typeof value !== 'number') {
        return false;
      }
    }
  }

  // Finally return true if i18nId seems correct.
  return MESSAGE_I18N_ID_REGEX.test(i18nId);
}

/**
 * Get the localized and formatted form of `icuMessageOrRawString` if it's an
 * LH.IcuMessage, or get it back directly if it's already a string.
 * Warning: this function throws if `icuMessageOrRawString` is not the expected
 * type (use function from `createIcuMessageFn` to create a valid LH.IcuMessage)
 * or `locale` isn't supported (use `lookupLocale` to find a valid locale).
 * @param {LH.IcuMessage | string} icuMessageOrRawString
 * @param {LH.Locale} locale
 * @return {string}
 */
function getFormatted(icuMessageOrRawString, locale) {
  if (isIcuMessage(icuMessageOrRawString)) {
    return _localizeIcuMessage(icuMessageOrRawString, locale);
  }

  if (typeof icuMessageOrRawString === 'string') {
    return icuMessageOrRawString;
  }

  // Should be impossible from types, but do a strict check in case malformed JSON makes it this far.
  throw new Error('Attempted to format invalid icuMessage type');
}

/** @param {string[]} pathInLHR */
function _formatPathAsString(pathInLHR) {
  let pathAsString = '';
  for (const property of pathInLHR) {
    if (/^[a-z]+$/i.test(property)) {
      if (pathAsString.length) pathAsString += '.';
      pathAsString += property;
    } else {
      if (/]|"|'|\s/.test(property)) throw new Error(`Cannot handle "${property}" in i18n`);
      pathAsString += `[${property}]`;
    }
  }

  return pathAsString;
}

/**
 * Recursively walk the input object, looking for property values that are
 * `LH.IcuMessage`s and replace them with their localized values. Primarily
 * used with the full LHR or a Config as input.
 * Returns a map of locations that were replaced to the `IcuMessage` that was at
 * that location.
 * @param {unknown} inputObject
 * @param {LH.Locale} locale
 * @return {LH.Result.IcuMessagePaths}
 */
function replaceIcuMessages(inputObject, locale) {
  /**
   * @param {unknown} subObject
   * @param {LH.Result.IcuMessagePaths} icuMessagePaths
   * @param {string[]} pathInLHR
   */
  function replaceInObject(subObject, icuMessagePaths, pathInLHR = []) {
    if (!isObjectOrArrayOfUnknownValues(subObject)) return;

    for (const [property, possibleIcuMessage] of Object.entries(subObject)) {
      const currentPathInLHR = pathInLHR.concat([property]);

      // Replace any IcuMessages with a localized string.
      if (isIcuMessage(possibleIcuMessage)) {
        const formattedString = getFormatted(possibleIcuMessage, locale);
        const messageInstancesInLHR = icuMessagePaths[possibleIcuMessage.i18nId] || [];
        const currentPathAsString = _formatPathAsString(currentPathInLHR);

        messageInstancesInLHR.push(
          possibleIcuMessage.values ?
            {values: possibleIcuMessage.values, path: currentPathAsString} :
            currentPathAsString
        );

        // @ts-ignore - tsc doesn't like that `property` can be either string key or array index.
        subObject[property] = formattedString;
        icuMessagePaths[possibleIcuMessage.i18nId] = messageInstancesInLHR;
      } else {
        replaceInObject(possibleIcuMessage, icuMessagePaths, currentPathInLHR);
      }
    }
  }

  /** @type {LH.Result.IcuMessagePaths} */
  const icuMessagePaths = {};
  replaceInObject(inputObject, icuMessagePaths);
  return icuMessagePaths;
}

/**
 * Returns the locale messages for the given `locale`, if they exist.
 * Throws if an unsupported locale.
 *
 * NOTE: If DEFAULT_LOCALE is requested and this is inside a bundle with locale
 * messages stripped, an empty object will be returned. Default fallbacks will need to handle that case.
 * @param {LH.Locale} locale
 * @return {import('./locales').LhlMessages}
 */
function _getLocaleMessages(locale) {
  const localeMessages = LOCALE_MESSAGES[locale];
  if (!localeMessages) {
    if (locale === DEFAULT_LOCALE) {
      // If the default locale isn't in LOCALE_MESSAGES, this is likely executing
      // in a bundle. Let the caller use the fallbacks available.
      return {};
    }
    throw new Error(`Unsupported locale '${locale}'`);
  }

  return localeMessages;
}

/**
 * Returns whether the `requestedLocale` is registered and available for use
 * @param {LH.Locale} requestedLocale
 * @return {boolean}
 */
function hasLocale(requestedLocale) {
  // The default locale is always supported through `IcuMessage.formattedDefault`.
  if (requestedLocale === DEFAULT_LOCALE) return true;

  const hasIntlSupport = Intl.NumberFormat.supportedLocalesOf([requestedLocale]).length > 0;
  const hasMessages = Boolean(LOCALE_MESSAGES[requestedLocale]);

  return hasIntlSupport && hasMessages;
}

/**
 * Returns a list of canonical locales, as defined by the existent message files.
 * In practice, each of these may have aliases in the full list returned by
 * `getAvailableLocales()`.
 * TODO: create a CanonicalLocale type
 * @return {Array<string>}
 */
function getCanonicalLocales() {
  return CANONICAL_LOCALES;
}

/**
 * Returns a list of available locales.
 *  - if full build, this includes all canonical locales, aliases, and any locale added
 *      via `registerLocaleData`.
 *  - if bundled and locale messages have been stripped (locales.js shimmed), this includes
 *      only DEFAULT_LOCALE and any locales from `registerLocaleData`.
 * @return {Array<LH.Locale>}
 */
function getAvailableLocales() {
  const localesWithMessages = new Set([...Object.keys(LOCALE_MESSAGES), DEFAULT_LOCALE]);
  return /** @type {Array<LH.Locale>} */ ([...localesWithMessages].sort());
}

/**
 * Populate the i18n string lookup dict with locale data
 * Used when the host environment selects the locale and serves lighthouse the intended locale file
 * @see https://docs.google.com/document/d/1jnt3BqKB-4q3AE94UWFA0Gqspx8Sd_jivlB7gQMlmfk/edit
 * @param {LH.Locale} locale
 * @param {import('./locales').LhlMessages} lhlMessages
 */
function registerLocaleData(locale, lhlMessages) {
  LOCALE_MESSAGES[locale] = lhlMessages;
}

/**
 * @param {string} i18nMessageId
 */
function getIcuMessageIdParts(i18nMessageId) {
  if (!MESSAGE_I18N_ID_REGEX.test(i18nMessageId)) {
    throw Error(`"${i18nMessageId}" does not appear to be a valid ICU message id`);
  }
  const [filename, key] = i18nMessageId.split(' | ');
  return {filename, key};
}

export {
  DEFAULT_LOCALE,
  _formatPathAsString,
  collectAllCustomElementsFromICU,
  isIcuMessage,
  getFormatted,
  getRendererFormattedStrings,
  replaceIcuMessages,
  hasLocale,
  registerLocaleData,
  formatMessage,
  getIcuMessageIdParts,
  getAvailableLocales,
  getCanonicalLocales,
  escapeIcuMessage,
};
