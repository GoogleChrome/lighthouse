/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generates the localized UI strings map that the hosted web apps
 * (Report Viewer & Treemap) use to render their own UI in the display locale.
 */

import {getIcuMessageIdParts} from '../shared/localization/format.js';
import {locales} from '../shared/localization/locales.js';

/**
 * @typedef {{uiStrings: Record<string, string>, filename: string}} StringsSource
 */

/**
 * Extract the localized versions of the given UIStrings into a script that sets
 * a global variable `strings`, whose keys are locale codes (en-US, zh-TW, etc.)
 * and whose values are the localized messages.
 * @param {StringsSource[]} stringsSources UIStrings modules to extract, matched
 *     against the filename portion of the localization message ids.
 * @return {string}
 */
function buildStringsGlobal(stringsSources) {
  const strings = /** @type {Record<LH.Locale, Record<string, string>>} */ ({});

  for (const [locale, lhlMessages] of Object.entries(locales)) {
    const localizedStrings = Object.fromEntries(
      Object.entries(lhlMessages).map(([icuMessageId, v]) => {
        const {filename, key} = getIcuMessageIdParts(icuMessageId);
        for (const {uiStrings, filename: sourceFilename} of stringsSources) {
          if (filename === sourceFilename && key in uiStrings) {
            return [key, v.message];
          }
        }
        return [];
      })
    );
    strings[/** @type {LH.Locale} */ (locale)] = localizedStrings;
  }

  return 'const strings =' + JSON.stringify(strings, null, 2) + ';';
}

export {buildStringsGlobal};
