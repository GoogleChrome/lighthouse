/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const MessageFormat = require('intl-messageformat').default;
const lookupClosestLocale = require('lookup-closest-locale');
const LOCALES = require('./locales.js');
const {isObjectOfUnknownValues, isObjectOrArrayOfUnknownValues} = require('../type-verifiers.js');

const DEFAULT_LOCALE = 'en';

/** @typedef {import('intl-messageformat-parser').Element} MessageElement */
/** @typedef {import('intl-messageformat-parser').ArgumentElement} ArgumentElement */

const LH_ROOT = path.join(__dirname, '../../../');
const MESSAGE_I18N_ID_REGEX = / | [^\s]+$/;

(() => {
  // Node without full-icu doesn't come with the locales we want built-in. Load the polyfill if needed.
  // See https://nodejs.org/api/intl.html#intl_options_for_building_node_js

  // Conditionally polyfills itself. Bundler removes this dep, so this will be a no-op in browsers.
  // @ts-expect-error
  require('intl-pluralrules');

  // @ts-expect-error
  const IntlPolyfill = require('intl');

  // The bundler also removes this dep, so there's nothing to do if it's empty.
  if (!IntlPolyfill.NumberFormat) return;

  // Check if global implementation supports a minimum set of locales.
  const minimumLocales = ['en', 'es', 'ru', 'zh'];
  const supportedLocales = Intl.NumberFormat.supportedLocalesOf(minimumLocales);

  if (supportedLocales.length !== minimumLocales.length) {
    Intl.NumberFormat = IntlPolyfill.NumberFormat;
    Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
  }
})();

const UIStrings = {
  /** Used to show the duration in milliseconds that something lasted. The `{timeInMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 63 ms) */
  ms: '{timeInMs, number, milliseconds}\xa0ms',
  /** Used to show the duration in seconds that something lasted. The {timeInMs} placeholder will be replaced with the time duration, shown in seconds (e.g. 5.2 s) */
  seconds: '{timeInMs, number, seconds}\xa0s',
  /** Label shown per-audit to show how many bytes smaller the page could be if the user implemented the suggestions. The `{wastedBytes}` placeholder will be replaced with the number of bytes, shown in kibibytes (e.g. 148 KiB) */
  displayValueByteSavings: 'Potential savings of {wastedBytes, number, bytes}\xa0KiB',
  /** Label shown per-audit to show how many milliseconds faster the page load could be if the user implemented the suggestions. The `{wastedMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 140 ms) */
  displayValueMsSavings: 'Potential savings of {wastedMs, number, milliseconds}\xa0ms',
  /** Label shown per-audit to show how many HTML elements did not pass the audit. The `{# elements found}` placeholder will be replaced with the number of failing HTML elements. */
  displayValueElementsFound: `{nodeCount, plural, =1 {1 element found} other {# elements found}}`,
  /** Label for a column in a data table; entries will be the URL of a web resource */
  columnURL: 'URL',
  /** Label for a column in a data table; entries will be the size or quantity of some resource, e.g. the width and height dimensions of an image or the number of images in a web page. */
  columnSize: 'Size',
  /** Label for a column in a data table; entries will be the file size of a web resource in kilobytes. */
  columnResourceSize: 'Resource Size',
  /** Label for a column in a data table; entries will be the download size of a web resource in kilobytes. */
  columnTransferSize: 'Transfer Size',
  /** Label for a column in a data table; entries will be the time to live value of the cache header on a web resource. */
  columnCacheTTL: 'Cache TTL',
  /** Label for a column in a data table; entries will be the number of kilobytes the user could reduce their page by if they implemented the suggestions. */
  columnWastedBytes: 'Potential Savings',
  /** Label for a column in a data table; entries will be the number of milliseconds the user could reduce page load by if they implemented the suggestions. */
  columnWastedMs: 'Potential Savings',
  /** Label for a table column that displays how much time each row spent blocking other work on the main thread, entries will be the number of milliseconds spent. */
  columnBlockingTime: 'Main-Thread Blocking Time',
  /** Label for a column in a data table; entries will be the number of milliseconds spent during a particular activity. */
  columnTimeSpent: 'Time Spent',
  /** Label for a column in a data table; entries will be the location of a specific line of code in a file, in the format "line: 102". */
  columnLocation: 'Location',
  /** Label for a column in a data table; entries will be types of resources loaded over the network, e.g. "Scripts", "Third-Party", "Stylesheet". */
  columnResourceType: 'Resource Type',
  /** Label for a column in a data table; entries will be the number of network requests done by a webpage. */
  columnRequests: 'Requests',
  /** Label for a column in a data table; entries will be the names of arbitrary objects, e.g. the name of a Javascript library, or the name of a user defined timing event. */
  columnName: 'Name',
  /** Label for a column in a data table; entries will be the locations of JavaScript or CSS code, e.g. the name of a Javascript package or module. */
  columnSource: 'Source',
  /** Label for a column in a data table; entries will be how much a predetermined budget has been exeeded by. Depending on the context, this number could represent an excess in quantity or size of network requests, or, an excess in the duration of time that it takes for the page to load.*/
  columnOverBudget: 'Over Budget',
  /** Label for a column in a data table; entries will be a representation of a DOM element. */
  columnElement: 'Element',
  /** Label for a column in a data table; entries will be the number of milliseconds since the page started loading. */
  columnStartTime: 'Start Time',
  /** Label for a column in a data table; entries will be the total number of milliseconds from the start time until the end time. */
  columnDuration: 'Duration',
  /** Label for a column in a data table; entries will be a representation of a DOM element that did not meet certain suggestions. */
  columnFailingElem: 'Failing Elements',
  /** Label for a column in a data table; entries will be a description of the table item. */
  columnDescription: 'Description',
  /** Label for a row in a data table; entries will be the total number and byte size of all resources loaded by a web page. */
  totalResourceType: 'Total',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Document' resources loaded by a web page. */
  documentResourceType: 'Document',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Script' resources loaded by a web page. 'Script' refers to JavaScript or other files that are executable by a browser. */
  scriptResourceType: 'Script',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Stylesheet' resources loaded by a web page. 'Stylesheet' refers to CSS stylesheets. */
  stylesheetResourceType: 'Stylesheet',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Image' resources loaded by a web page. */
  imageResourceType: 'Image',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Media' resources loaded by a web page. 'Media' refers to audio and video files. */
  mediaResourceType: 'Media',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Font' resources loaded by a web page. */
  fontResourceType: 'Font',
  /** Label for a row in a data table; entries will be the total number and byte size of all resources loaded by a web page that don't fit into the categories of Document, Script, Stylesheet, Image, Media, & Font.*/
  otherResourceType: 'Other',
  /** Label for a row in a data table; entries will be the total number and byte size of all third-party resources loaded by a web page. 'Third-party resources are items loaded from URLs that aren't controlled by the owner of the web page. */
  thirdPartyResourceType: 'Third-party',
  /** Label used to identify a value in a table where many individual values are aggregated to a single value, for brevity. "Other resources" could also be read as "the rest of the resources". Resource refers to network resources requested by the browser. */
  otherResourcesLabel: 'Other resources',
  /** The name of the metric that marks the time at which the first text or image is painted by the browser. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  firstContentfulPaintMetric: 'First Contentful Paint',
  /** The name of the metric that marks when the page has displayed content and the CPU is not busy executing the page's scripts. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  firstCPUIdleMetric: 'First CPU Idle',
  /** The name of the metric that marks the time at which the page is fully loaded and is able to quickly respond to user input (clicks, taps, and keypresses feel responsive). Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  interactiveMetric: 'Time to Interactive',
  /** The name of the metric that marks the time at which a majority of the content has been painted by the browser. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  firstMeaningfulPaintMetric: 'First Meaningful Paint',
  /** The name of the metric that marks the estimated time between the page receiving input (a user clicking, tapping, or typing) and the page responding. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  estimatedInputLatencyMetric: 'Estimated Input Latency',
  /** The name of a metric that calculates the total duration of blocking time for a web page. Blocking times are time periods when the page would be blocked (prevented) from responding to user input (clicks, taps, and keypresses will feel slow to respond). Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  totalBlockingTimeMetric: 'Total Blocking Time',
  /** The name of the metric "Maximum Potential First Input Delay" that marks the maximum estimated time between the page receiving input (a user clicking, tapping, or typing) and the page responding. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  maxPotentialFIDMetric: 'Max Potential First Input Delay',
  /** The name of the metric that summarizes how quickly the page looked visually complete. The name of this metric is largely abstract and can be loosely translated. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  speedIndexMetric: 'Speed Index',
  /** The name of the metric that marks the time at which the largest text or image is painted by the browser. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  largestContentfulPaintMetric: 'Largest Contentful Paint',
  /** The name of the metric "Cumulative Layout Shift" that indicates how much the page changes its layout while it loads. If big segments of the page shift their location during load, the Cumulative Layout Shift will be higher. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  cumulativeLayoutShiftMetric: 'Cumulative Layout Shift',
};

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
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 *
 * If `locale` isn't provided or one could not be found, DEFAULT_LOCALE is returned.
 * @param {string|string[]=} locales
 * @return {LH.Locale}
 */
function lookupLocale(locales) {
  // TODO: could do more work to sniff out default locale
  const canonicalLocales = Intl.getCanonicalLocales(locales);

  const closestLocale = lookupClosestLocale(canonicalLocales, LOCALES);
  return closestLocale || DEFAULT_LOCALE;
}

/**
 * Function to retrieve all 'argumentElement's from an ICU message. An argumentElement
 * is an ICU element with an argument in it, like '{varName}' or '{varName, number, bytes}'. This
 * differs from 'messageElement's which are just arbitrary text in a message.
 *
 * Notes:
 *  This function will recursively inspect plural elements for nested argumentElements.
 *
 *  We need to find all the elements from the plural format sections, but
 *  they need to be deduplicated. I.e. "=1{hello {icu}} =other{hello {icu}}"
 *  the variable "icu" would appear twice if it wasn't de duplicated. And they cannot
 *  be stored in a set because they are not equal since their locations are different,
 *  thus they are stored via a Map keyed on the "id" which is the ICU varName.
 *
 * @param {Array<MessageElement>} icuElements
 * @param {Map<string, ArgumentElement>} [seenElementsById]
 * @return {Map<string, ArgumentElement>}
 */
function collectAllCustomElementsFromICU(icuElements, seenElementsById = new Map()) {
  for (const el of icuElements) {
    // We are only interested in elements that need ICU formatting (argumentElements)
    if (el.type !== 'argumentElement') continue;

    seenElementsById.set(el.id, el);

    // Plurals need to be inspected recursively
    if (!el.format || el.format.type !== 'pluralFormat') continue;
    // Look at all options of the plural (=1{} =other{}...)
    for (const option of el.format.options) {
      // Run collections on each option's elements
      collectAllCustomElementsFromICU(option.value.elements, seenElementsById);
    }
  }

  return seenElementsById;
}

/**
 * Returns a copy of the `values` object, with the values formatted based on how
 * they will be used in their icuMessage, e.g. KB or milliseconds. The original
 * object is unchanged.
 * @param {MessageFormat} messageFormatter
 * @param {Readonly<Record<string, string | number>>} values
 * @param {string} lhlMessage Used for clear error logging.
 * @return {Record<string, string | number>}
 */
function _preformatValues(messageFormatter, values, lhlMessage) {
  const elementMap = collectAllCustomElementsFromICU(messageFormatter.getAst().elements);
  const argumentElements = [...elementMap.values()];

  /** @type {Record<string, string | number>} */
  const formattedValues = {};

  for (const {id, format} of argumentElements) {
    // Throw an error if a message's value isn't provided
    if (id && (id in values) === false) {
      throw new Error(`ICU Message "${lhlMessage}" contains a value reference ("${id}") ` +
        `that wasn't provided`);
    }

    const value = values[id];

    // Direct `{id}` replacement and non-numeric values need no formatting.
    if (!format || format.type !== 'numberFormat') {
      formattedValues[id] = value;
      continue;
    }

    if (typeof value !== 'number') {
      throw new Error(`ICU Message "${lhlMessage}" contains a numeric reference ("${id}") ` +
        'but provided value was not a number');
    }

    // Format values for known styles.
    if (format.style === 'milliseconds') {
      // Round all milliseconds to the nearest 10.
      formattedValues[id] = Math.round(value / 10) * 10;
    } else if (format.style === 'seconds' && id === 'timeInMs') {
      // Convert all seconds to the correct unit (currently only for `timeInMs`).
      formattedValues[id] = Math.round(value / 100) / 10;
    } else if (format.style === 'bytes') {
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

    // errorCode is a special case always allowed to help LHError ease-of-use.
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
 * Format string `message` by localizing `values` and inserting them.
 * @param {string} message
 * @param {Record<string, string | number>} values
 * @param {LH.Locale} locale
 * @return {string}
 */
function _formatMessage(message, values = {}, locale) {
  // When using accented english, force the use of a different locale for number formatting.
  const localeForMessageFormat = (locale === 'en-XA' || locale === 'en-XL') ? 'de-DE' : locale;

  const formatter = new MessageFormat(message, localeForMessageFormat, formats);

  // Preformat values for the message format like KB and milliseconds.
  const valuesForMessageFormat = _preformatValues(formatter, values, message);

  return formatter.format(valuesForMessageFormat);
}

/**
 * Retrieves the localized version of `icuMessage` and formats with any given
 * value replacements.
 * @param {LH.IcuMessage} icuMessage
 * @param {LH.Locale} locale
 * @param {?LH.LocaleConfig} pluginLocales
 * @return {string}
 */
function _localizeIcuMessage(icuMessage, locale, pluginLocales) {
  let localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);
  if (pluginLocales) {
    localeMessages = Object.assign(localeMessages, pluginLocales[locale]);
  }
  const localeMessage = localeMessages[icuMessage.i18nId];

  // Fall back to the default (usually the original english message) if we couldn't find a
  // message in the specified locale. This could be because of string drift between
  // Lighthouse versions or because new strings haven't been updated yet. Better to have
  // an english message than no message at all; in some cases it won't even matter.
  if (!localeMessage) {
    return icuMessage.formattedDefault;
  }

  return _formatMessage(localeMessage.message, icuMessage.values, locale);
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
 * @param {LH.Locale} locale
 * @return {LH.I18NRendererStrings}
 */
function getRendererFormattedStrings(locale) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);

  const icuMessageIds = Object.keys(localeMessages).filter(f => f.includes('core/report/html/'));
  const strings = /** @type {LH.I18NRendererStrings} */ ({});
  for (const icuMessageId of icuMessageIds) {
    const [filename, varName] = icuMessageId.split(' | ');
    if (!filename.endsWith('util.js')) throw new Error(`Unexpected message: ${icuMessageId}`);

    const key = /** @type {keyof LH.I18NRendererStrings} */ (varName);
    strings[key] = localeMessages[icuMessageId].message;
  }

  return strings;
}

/**
 * Returns a function that generates `LH.IcuMessage` objects to localize the
 * messages in `fileStrings` and the shared `i18n.UIStrings`.
 * @param {string} filename
 * @param {Record<string, string>} fileStrings
 */
function createIcuMessageFn(filename, fileStrings) {
  /**
   * Combined so fn can access both caller's strings and i18n.UIStrings shared across LH.
   * @type {Record<string, string>}
   */
  const mergedStrings = {...UIStrings, ...fileStrings};

  /**
   * Convert a message string and replacement values into an `LH.IcuMessage`.
   * @param {string} message
   * @param {Record<string, string | number>} [values]
   * @return {LH.IcuMessage}
   */
  const getIcuMessageFn = (message, values) => {
    const keyname = Object.keys(mergedStrings).find(key => mergedStrings[key] === message);
    if (!keyname) throw new Error(`Could not locate: ${message}`);

    const filenameToLookup = keyname in fileStrings ? filename : __filename;
    const i18nId = createI18nId(filenameToLookup, keyname);

    return {
      i18nId,
      values,
      formattedDefault: _formatMessage(message, values, DEFAULT_LOCALE),
    };
  };

  return getIcuMessageFn;
}

/**
   * @param {string} filename
   * @param {string} keyname
   * @return {string} i18nId
   */
function createI18nId(filename, keyname) {
  const unixStyleFilename = path.relative(LH_ROOT, filename).replace(/\\/g, '/');
  return `${unixStyleFilename} | ${keyname}`;
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
 * @param {?LH.LocaleConfig=} pluginLocales
 * @return {string}
 */
function getFormatted(icuMessageOrRawString, locale, pluginLocales = null) {
  if (isIcuMessage(icuMessageOrRawString)) {
    return _localizeIcuMessage(icuMessageOrRawString, locale, pluginLocales);
  }

  if (typeof icuMessageOrRawString === 'string') {
    return icuMessageOrRawString;
  }

  // Should be impossible from types, but do a strict check in case malformed JSON makes it this far.
  throw new Error('Attempted to format invalid icuMessage type');
}

/**
 * Recursively walk the input object, looking for property values that are
 * `LH.IcuMessage`s and replace them with their localized values. Primarily
 * used with the full LHR or a Config as input.
 * Returns a map of locations that were replaced to the `IcuMessage` that was at
 * that location.
 * @param {unknown} inputObject
 * @param {LH.Locale} locale
 * @param {?LH.LocaleConfig} pluginLocales
 * @return {LH.IcuMessagePaths}
 */
function replaceIcuMessages(inputObject, locale, pluginLocales) {
  /**
   * @param {unknown} subObject
   * @param {LH.IcuMessagePaths} icuMessagePaths
   * @param {string[]} pathInLHR
   */
  function replaceInObject(subObject, icuMessagePaths, pathInLHR = []) {
    if (!isObjectOrArrayOfUnknownValues(subObject)) return;

    for (const [property, possibleIcuMessage] of Object.entries(subObject)) {
      const currentPathInLHR = pathInLHR.concat([property]);

      // Replace any IcuMessages with a localized string.
      if (isIcuMessage(possibleIcuMessage)) {
        const formattedString = _localizeIcuMessage(possibleIcuMessage, locale, pluginLocales);
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

  /** @type {LH.IcuMessagePaths} */
  const icuMessagePaths = {};
  replaceInObject(inputObject, icuMessagePaths);
  return icuMessagePaths;
}

/** @typedef {import('./locales').LhlMessages} LhlMessages */

/**
 * Populate the i18n string lookup dict with locale data
 * Used when the host environment selects the locale and serves lighthouse the intended locale file
 * @see https://docs.google.com/document/d/1jnt3BqKB-4q3AE94UWFA0Gqspx8Sd_jivlB7gQMlmfk/edit
 * @param {LH.Locale} locale
 * @param {LhlMessages} lhlMessages
 */
function registerLocaleData(locale, lhlMessages) {
  LOCALES[locale] = lhlMessages;
}

/**
 * Returns true if the given value is a string or an LH.IcuMessage.
 * @param {unknown} value
 * @return {value is string|LH.IcuMessage}
 */
function isStringOrIcuMessage(value) {
  return typeof value === 'string' || isIcuMessage(value);
}

module.exports = {
  _formatPathAsString,
  UIStrings,
  lookupLocale,
  getRendererFormattedStrings,
  createI18nId,
  createIcuMessageFn,
  getFormatted,
  replaceIcuMessages,
  isIcuMessage,
  collectAllCustomElementsFromICU,
  registerLocaleData,
  isStringOrIcuMessage,
  // TODO: exported for backwards compatibility. Consider removing on future breaking change.
  createMessageInstanceIdFn: createIcuMessageFn,
};
