/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('../../../shared/localization/locales').LhlMessages} LhlMessages */

import path from 'path';
import url from 'url';

import lookupClosestLocale from 'lookup-closest-locale';
import log from 'lighthouse-logger';

import {getAvailableLocales} from '../../../shared/localization/format.js';
import {LH_ROOT} from '../../../shared/root.js';
import {isIcuMessage, formatMessage, DEFAULT_LOCALE} from '../../../shared/localization/format.js';
import {getModulePath} from '../../../shared/esm-utils.js';

/* eslint-disable max-len */
const UIStrings = {
  /** Used to show the duration in milliseconds that something lasted. The `{timeInMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 63 ms) */
  ms: '{timeInMs, number, milliseconds}\xa0ms',
  /** Used to show the duration in seconds that something lasted. The {timeInMs} placeholder will be replaced with the time duration, shown in seconds (e.g. 5.2 s) */
  seconds: '{timeInMs, number, seconds}\xa0s',
  /** Label shown per-audit to show how many bytes smaller the page could be if the user implemented the suggestions. The `{wastedBytes}` placeholder will be replaced with the number of bytes, shown in kibibytes (e.g. 148 KiB) */
  displayValueByteSavings: 'Est savings of {wastedBytes, number, bytes}\xa0KiB',
  /** Label shown per-audit to show how many milliseconds faster the page load could be if the user implemented the suggestions. The `{wastedMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 140 ms) */
  displayValueMsSavings: 'Est savings of {wastedMs, number, milliseconds}\xa0ms',
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
  columnWastedBytes: 'Est Savings',
  /** Label for a column in a data table; entries will be the number of milliseconds the user could reduce page load by if they implemented the suggestions. */
  columnWastedMs: 'Est Savings',
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
  /** Label for a row in a data table; the row represents the total number of something. */
  total: 'Total',
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
  /** The name of the metric that marks the time at which the page is fully loaded and is able to quickly respond to user input (clicks, taps, and keypresses feel responsive). Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  interactiveMetric: 'Time to Interactive',
  /** The name of the metric that marks the time at which a majority of the content has been painted by the browser. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  firstMeaningfulPaintMetric: 'First Meaningful Paint',
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
  /** The name of the "Interaction to Next Paint" metric that measures the time between a user interaction and when the browser displays a response on screen. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  interactionToNextPaint: 'Interaction to Next Paint',
  /** Table item value for the severity of a small, or low impact vulnerability. Part of a ranking scale in the form: low, medium, high. */
  itemSeverityLow: 'Low',
  /** Table item value for the severity of a vulnerability. Part of a ranking scale in the form: low, medium, high. */
  itemSeverityMedium: 'Medium',
  /** Table item value for the severity of a high impact, or dangerous vulnerability. Part of a ranking scale in the form: low, medium, high. */
  itemSeverityHigh: 'High',
};
/* eslint-enable max-len */

/**
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 * - supported locales in Intl formatters
 *
 * If `locale` isn't provided or one could not be found, DEFAULT_LOCALE is returned.
 *
 * By default any of the locales Lighthouse has strings for can be returned, but this
 * can be overridden with `possibleLocales`, useful e.g. when Lighthouse is bundled and
 * only DEFAULT_LOCALE is available, but `possibleLocales` can be used to select a
 * locale available to be downloaded on demand.
 * @param {string|string[]=} locales
 * @param {Array<string>=} possibleLocales
 * @return {LH.Locale}
 */
function lookupLocale(locales, possibleLocales) {
  // TODO: lookupLocale may need to be split into two functions, one that canonicalizes
  // locales and one that looks up the best locale filename for a given locale.
  // e.g. `en-IE` is canonical, but uses `en-GB.json`. See TODO in locales.js

  if (typeof Intl !== 'object') {
    // If Node was built with `--with-intl=none`, `Intl` won't exist.
    throw new Error('Lighthouse must be run in Node with `Intl` support. See https://nodejs.org/api/intl.html for help');
  }

  const canonicalLocales = Intl.getCanonicalLocales(locales);

  // Filter by what's available in this runtime.
  const availableLocales = Intl.NumberFormat.supportedLocalesOf(canonicalLocales);

  // Get available locales and transform into object to match `lookupClosestLocale`'s API.
  const localesWithMessages = possibleLocales || getAvailableLocales();
  const localesWithmessagesObj = /** @type {Record<LH.Locale, LhlMessages>} */ (
    Object.fromEntries(localesWithMessages.map(l => [l, {}])));

  const closestLocale = lookupClosestLocale(availableLocales, localesWithmessagesObj);

  if (!closestLocale) {
    // Log extra info if we're pretty sure this version of Node was built with `--with-intl=small-icu`.
    if (Intl.NumberFormat.supportedLocalesOf('es').length === 0) {
      log.warn('i18n', 'Requested locale not available in this version of node. The `full-icu` npm module can provide additional locales. For help, see https://github.com/GoogleChrome/lighthouse/blob/main/readme.md#how-do-i-get-localized-lighthouse-results-via-the-cli');
    }
    // eslint-disable-next-line max-len
    log.warn('i18n', `locale(s) '${locales}' not available. Falling back to default '${DEFAULT_LOCALE}'`);
  }

  return closestLocale || DEFAULT_LOCALE;
}

/**
 * Returns a function that generates `LH.IcuMessage` objects to localize the
 * messages in `fileStrings` and the shared `i18n.UIStrings`.
 * @param {string} filename
 * @param {Record<string, string>=} fileStrings
 */
function createIcuMessageFn(filename, fileStrings = {}) {
  if (filename.startsWith('file://')) filename = url.fileURLToPath(filename);

  // In the common case, `filename` is an absolute path that needs to be transformed
  // to be relative to LH_ROOT. In other cases, `filename` might be the exact i18n identifier
  // already (see: stack-packs.js, or bundled lighthouse).
  if (path.isAbsolute(filename)) filename = path.relative(LH_ROOT, filename);

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

    // `message` can be a UIString defined within the provided `fileStrings`, or it could be
    // one of the common strings found in `i18n.UIStrings`.
    const filenameToLookup = keyname in fileStrings ?
      filename :
      path.relative(LH_ROOT, getModulePath(import.meta));
    const unixStyleFilename = filenameToLookup.replace(/\\/g, '/');
    const i18nId = `${unixStyleFilename} | ${keyname}`;

    return {
      i18nId,
      values,
      formattedDefault: formatMessage(message, values, DEFAULT_LOCALE),
    };
  };

  return getIcuMessageFn;
}

/**
 * Returns true if the given value is a string or an LH.IcuMessage.
 * @param {unknown} value
 * @return {value is string|LH.IcuMessage}
 */
function isStringOrIcuMessage(value) {
  return typeof value === 'string' || isIcuMessage(value);
}

export {
  UIStrings,
  lookupLocale,
  createIcuMessageFn,
  isStringOrIcuMessage,
};
