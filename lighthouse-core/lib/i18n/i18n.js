/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const isDeepEqual = require('lodash.isequal');
const log = require('lighthouse-logger');
const MessageFormat = require('intl-messageformat').default;
const lookupClosestLocale = require('lookup-closest-locale');
const LOCALES = require('./locales.js');

/** @typedef {import('intl-messageformat-parser').Element} MessageElement */
/** @typedef {import('intl-messageformat-parser').ArgumentElement} ArgumentElement */

const LH_ROOT = path.join(__dirname, '../../../');
const MESSAGE_INSTANCE_ID_REGEX = /(.* \| .*) # (\d+)$/;
// Above regex is very slow against large strings. Use QUICK_REGEX as a much quicker discriminator.
const MESSAGE_INSTANCE_ID_QUICK_REGEX = / # \d+$/;

(() => {
  // Node without full-icu doesn't come with the locales we want built-in. Load the polyfill if needed.
  // See https://nodejs.org/api/intl.html#intl_options_for_building_node_js

  // Conditionally polyfills itself. Bundler removes this dep, so this will be a no-op in browsers.
  // @ts-ignore
  require('intl-pluralrules');

  // @ts-ignore
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
  /** Label shown per-audit to show how many bytes smaller the page could be if the user implemented the suggestions. The `{wastedBytes}` placeholder will be replaced with the number of bytes, shown in kilobytes (e.g. 148 KB) */
  displayValueByteSavings: 'Potential savings of {wastedBytes, number, bytes}\xa0KB',
  /** Label shown per-audit to show how many milliseconds faster the page load could be if the user implemented the suggestions. The `{wastedMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 140 ms) */
  displayValueMsSavings: 'Potential savings of {wastedMs, number, milliseconds}\xa0ms',
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
  /** Label for a column in a data table; entries will be the names of JavaScript code, e.g. the name of a Javascript package or module. */
  columnSource: 'Source',
  /** Label for a column in a data table; entries will be how much a predetermined budget has been exeeded by. Depending on the context, this number could represent an excess in quantity or size of network requests, or, an excess in the duration of time that it takes for the page to load.*/
  columnOverBudget: 'Over Budget',
  /** Label for a column in a data table; entries will be a representation of a DOM element. */
  columnElement: 'Element',
  /** Label for a column in a data table; entries will be the number of milliseconds since the page started loading. */
  columnStartTime: 'Start Time',
  /** Label for a column in a data table; entries will be the total number of milliseconds from the start time until the end time. */
  columnDuration: 'Duration',
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
 * - the default locale ('en') if no match is found
 *
 * If `locale` isn't provided, the default is used.
 * @param {string=} locale
 * @return {LH.Locale}
 */
function lookupLocale(locale) {
  // TODO: could do more work to sniff out default locale
  const canonicalLocale = Intl.getCanonicalLocales(locale)[0];

  const closestLocale = lookupClosestLocale(canonicalLocale, LOCALES);
  return closestLocale || 'en';
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
 * they will be used in the `icuMessage`, e.g. KB or milliseconds. The original
 * object is unchanged.
 * @param {string} icuMessage
 * @param {MessageFormat} messageFormatter
 * @param {Readonly<Record<string, string | number>>} values
 * @return {Record<string, string | number>}
 */
function _preformatValues(icuMessage, messageFormatter, values) {
  const elementMap = collectAllCustomElementsFromICU(messageFormatter.getAst().elements);
  const argumentElements = [...elementMap.values()];

  /** @type {Record<string, string | number>} */
  const formattedValues = {};

  for (const {id, format} of argumentElements) {
    // Throw an error if a message's value isn't provided
    if (id && (id in values) === false) {
      throw new Error(`ICU Message "${icuMessage}" contains a value reference ("${id}") ` +
        `that wasn't provided`);
    }

    const value = values[id];

    // Direct `{id}` replacement and non-numeric values need no formatting.
    if (!format || format.type !== 'numberFormat') {
      formattedValues[id] = value;
      continue;
    }

    if (typeof value !== 'number') {
      throw new Error(`ICU Message "${icuMessage}" contains a numeric reference ("${id}") ` +
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
      `ICU message "${icuMessage}"`);
  }

  return formattedValues;
}

/**
 * @typedef IcuMessageInstance
 * @prop {string} icuMessageId
 * @prop {string} icuMessage
 * @prop {Record<string, string | number>|undefined} [values]
 */

/** @type {Map<string, IcuMessageInstance[]>} */
const _icuMessageInstanceMap = new Map();

const _ICUMsgNotFoundMsg = 'ICU message not found in destination locale';
/**
 *
 * @param {LH.Locale} locale
 * @param {string} icuMessageId
 * @param {string=} uiStringMessage The original string given in 'UIStrings', used as a backup if no locale message can be found
 * @param {Record<string, string | number>} [values]
 * @return {{formattedString: string, icuMessage: string}}
 */
function _formatIcuMessage(locale, icuMessageId, uiStringMessage, values = {}) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);
  let localeMessage = localeMessages[icuMessageId] && localeMessages[icuMessageId].message;

  // fallback to the original english message if we couldn't find a message in the specified locale
  // better to have an english message than no message at all, in some number cases it won't even matter
  if (!localeMessage && uiStringMessage) {
    // Try to use the original uiStringMessage
    localeMessage = uiStringMessage;

    // Warn the user that the UIString message != the `en` message ∴ they should update the strings
    if (!LOCALES.en[icuMessageId] || localeMessage !== LOCALES.en[icuMessageId].message) {
      log.verbose('i18n', `Message "${icuMessageId}" does not match its 'en' counterpart. ` +
        `Run 'i18n' to update.`);
    }
  }
  // At this point, there is no reasonable string to show to the user, so throw.
  if (!localeMessage) {
    throw new Error(_ICUMsgNotFoundMsg);
  }

  // when using accented english, force the use of a different locale for number formatting
  const localeForMessageFormat = (locale === 'en-XA' || locale === 'en-XL') ? 'de-DE' : locale;

  const formatter = new MessageFormat(localeMessage, localeForMessageFormat, formats);

  // preformat values for the message format like KB and milliseconds
  const valuesForMessageFormat = _preformatValues(localeMessage, formatter, values);

  const formattedString = formatter.format(valuesForMessageFormat);
  return {formattedString, icuMessage: localeMessage};
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
 * Register a file's UIStrings with i18n, return function to
 * generate the string ids.
 *
 * @param {string} filename
 * @param {Record<string, string>} fileStrings
 */
function createMessageInstanceIdFn(filename, fileStrings) {
  /** @type {Record<string, string>} */
  const mergedStrings = {...UIStrings, ...fileStrings};

  /**
   * Convert a message string & replacement values into an
   * indexed id value in the form '{messageid} | # {index}'.
   *
   * @param {string} icuMessage
   * @param {Record<string, string | number>} [values]
   * */
  const getMessageInstanceIdFn = (icuMessage, values) => {
    const keyname = Object.keys(mergedStrings).find(key => mergedStrings[key] === icuMessage);
    if (!keyname) throw new Error(`Could not locate: ${icuMessage}`);

    const filenameToLookup = keyname in fileStrings ? filename : __filename;
    const unixStyleFilename = path.relative(LH_ROOT, filenameToLookup).replace(/\\/g, '/');
    const icuMessageId = `${unixStyleFilename} | ${keyname}`;
    const icuMessageInstances = _icuMessageInstanceMap.get(icuMessageId) || [];

    let indexOfInstance = icuMessageInstances.findIndex(inst => isDeepEqual(inst.values, values));
    if (indexOfInstance === -1) {
      icuMessageInstances.push({icuMessageId, icuMessage, values});
      indexOfInstance = icuMessageInstances.length - 1;
    }

    _icuMessageInstanceMap.set(icuMessageId, icuMessageInstances);

    return `${icuMessageId} # ${indexOfInstance}`;
  };

  return getMessageInstanceIdFn;
}

/**
 * Returns true if string is an ICUMessage reference.
 * @param {string} icuMessageIdOrRawString
 * @return {boolean}
 */
function isIcuMessage(icuMessageIdOrRawString) {
  return MESSAGE_INSTANCE_ID_QUICK_REGEX.test(icuMessageIdOrRawString) &&
      MESSAGE_INSTANCE_ID_REGEX.test(icuMessageIdOrRawString);
}

/**
 * @param {string} icuMessageIdOrRawString
 * @param {LH.Locale} locale
 * @return {string}
 */
function getFormatted(icuMessageIdOrRawString, locale) {
  if (isIcuMessage(icuMessageIdOrRawString)) {
    return _resolveIcuMessageInstanceId(icuMessageIdOrRawString, locale).formattedString;
  }

  return icuMessageIdOrRawString;
}

/**
 * @param {LH.Locale} locale
 * @param {string} icuMessageId
 * @param {Record<string, string | number>} [values]
 * @return {string}
 */
function getFormattedFromIdAndValues(locale, icuMessageId, values) {
  const icuMessageIdRegex = /(.* \| .*)$/;
  if (!icuMessageIdRegex.test(icuMessageId)) throw new Error('This is not an ICU message ID');

  const {formattedString} = _formatIcuMessage(locale, icuMessageId, undefined, values);
  return formattedString;
}

/**
 * @param {string} icuMessageInstanceId
 * @param {LH.Locale} locale
 * @return {{icuMessageInstance: IcuMessageInstance, formattedString: string}}
 */
function _resolveIcuMessageInstanceId(icuMessageInstanceId, locale) {
  const matches = icuMessageInstanceId.match(MESSAGE_INSTANCE_ID_REGEX);
  if (!matches) throw new Error(`${icuMessageInstanceId} is not a valid message instance ID`);

  const [_, icuMessageId, icuMessageInstanceIndex] = matches;
  const icuMessageInstances = _icuMessageInstanceMap.get(icuMessageId) || [];
  const icuMessageInstance = icuMessageInstances[Number(icuMessageInstanceIndex)];

  const {formattedString} = _formatIcuMessage(locale, icuMessageId,
    icuMessageInstance.icuMessage, icuMessageInstance.values);

  return {icuMessageInstance, formattedString};
}

/**
 * Recursively walk the input object, looking for property values that are
 * string references and replace them with their localized values. Primarily
 * used with the full LHR as input.
 * @param {*} inputObject
 * @param {LH.Locale} locale
 * @return {LH.I18NMessages}
 */
function replaceIcuMessageInstanceIds(inputObject, locale) {
  /**
   * @param {*} subObject
   * @param {LH.I18NMessages} icuMessagePaths
   * @param {string[]} pathInLHR
   */
  function replaceInObject(subObject, icuMessagePaths, pathInLHR = []) {
    if (typeof subObject !== 'object' || !subObject) return;

    for (const [property, value] of Object.entries(subObject)) {
      const currentPathInLHR = pathInLHR.concat([property]);

      // Check to see if the value in the LHR looks like a string reference. If it is, replace it.
      if (typeof value === 'string' && isIcuMessage(value)) {
        const {icuMessageInstance, formattedString} = _resolveIcuMessageInstanceId(value, locale);
        const messageInstancesInLHR = icuMessagePaths[icuMessageInstance.icuMessageId] || [];
        const currentPathAsString = _formatPathAsString(currentPathInLHR);

        messageInstancesInLHR.push(
          icuMessageInstance.values ?
            {values: icuMessageInstance.values, path: currentPathAsString} :
            currentPathAsString
        );

        subObject[property] = formattedString;
        icuMessagePaths[icuMessageInstance.icuMessageId] = messageInstancesInLHR;
      } else {
        replaceInObject(value, icuMessagePaths, currentPathInLHR);
      }
    }
  }

  /** @type {LH.I18NMessages} */
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

module.exports = {
  _formatPathAsString,
  _ICUMsgNotFoundMsg,
  UIStrings,
  lookupLocale,
  getRendererFormattedStrings,
  createMessageInstanceIdFn,
  getFormatted,
  getFormattedFromIdAndValues,
  replaceIcuMessageInstanceIds,
  isIcuMessage,
  collectAllCustomElementsFromICU,
  registerLocaleData,
};
