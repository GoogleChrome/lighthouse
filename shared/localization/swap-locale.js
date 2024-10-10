/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {set} from 'lodash-es';
import {get} from 'lodash-es';

import * as format from './format.js';

/**
 * @fileoverview Use the lhr.i18n.icuMessagePaths object to change locales.
 *
 * `icuMessagePaths` is an object keyed by `LH.IcuMessage['i18nId']`s. Within each is either
 * 1) an array of strings, which are just object paths to where that message is used in the LHR
 * 2) an array of `LH.IcuMessagePath`s which include both a `path` and a `values` object
 *    which will be used in the replacement within `format.getFormatted()`
 *
 * An example:
    "icuMessagePaths": {
    "core/audits/metrics/first-contentful-paint.js | title": [
      "audits[first-contentful-paint].title"
    ],
    "core/audits/server-response-time.js | displayValue": [
      {
        "values": {
          "timeInMs": 570.5630000000001
        },
        "path": "audits[server-response-time].displayValue"
      }
    ],
    "core/lib/i18n/i18n.js | columnTimeSpent": [
      "audits[mainthread-work-breakdown].details.headings[1].text",
      "audits[network-rtt].details.headings[1].text",
      "audits[network-server-latency].details.headings[1].text"
    ],
    ...
 */

/**
 * Returns a new LHR with all strings changed to the new `requestedLocale`.
 * @param {LH.Result} lhr
 * @param {LH.Locale} requestedLocale
 * @return {{lhr: LH.Result, missingIcuMessageIds: string[]}}
 */
function swapLocale(lhr, requestedLocale) {
  // Copy LHR to avoid mutating provided LHR.
  lhr = JSON.parse(JSON.stringify(lhr));

  if (!format.hasLocale(requestedLocale)) {
    throw new Error(`Unsupported locale '${requestedLocale}'`);
  }
  const originalLocale = lhr.configSettings.locale;
  const {icuMessagePaths} = lhr.i18n;
  const missingIcuMessageIds = [];

  if (!icuMessagePaths) throw new Error('missing icuMessagePaths');

  for (const [i18nId, icuMessagePath] of Object.entries(icuMessagePaths)) {
    for (const instance of icuMessagePath) {
      // The path that _formatPathAsString() generated.
      let path;
      let values;
      if (typeof instance === 'string') {
        path = instance;
      } else {
        path = instance.path;
        // `values` are the string template values to be used. eg. `values: {wastedBytes: 9028}`
        values = instance.values;
      }

      // If the path isn't valid or the value isn't a string, there's no point in trying to replace it.
      /** @type {unknown} */
      const originalString = get(lhr, path);
      if (typeof originalString !== 'string') {
        continue;
      }

      const icuMessage = {
        i18nId,
        values,
        // The default value is the string already in place.
        formattedDefault: originalString,
      };
      // Get new formatted strings in revised locale.
      const relocalizedString = format.getFormatted(icuMessage, requestedLocale);

      // If we couldn't find a new replacement message, keep things as is.
      if (relocalizedString === originalString) {
        if (requestedLocale !== originalLocale) {
          // If the string remained the same while the locale changed, there may have been an issue.
          missingIcuMessageIds.push(i18nId);
        }
        continue;
      }

      // Write string back into the LHR.
      set(lhr, path, relocalizedString);
    }
  }

  lhr.i18n.rendererFormattedStrings = format.getRendererFormattedStrings(requestedLocale);
  // Tweak the config locale
  lhr.configSettings.locale = requestedLocale;
  return {
    lhr,
    missingIcuMessageIds,
  };
}

export {swapLocale};
