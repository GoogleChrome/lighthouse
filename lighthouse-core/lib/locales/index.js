/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {Record<string, {message: string}>} LocaleMessages */

/** @type {Record<LH.Locale, LocaleMessages>} */
const locales = {
  'en-US': require('./en-US.json'), // The 'source' strings, with descriptions

  // TODO: We shouldn't ship all of en-IE, only the ~10 messages that are different from en-US
  'en': require('./en-IE.json'), // en-* fallback, use non-american English. Applied to en-GB. en-IE, en-SG, en-ZA, en-IN

  'gsw': require('./de.json'), // swiss german. identical (for our purposes) to 'de'

  // All locales from here have a messages file, though we allow fallback to the base locale when the files are identical
  'ar-XB': require('./ar-XB.json'), // psuedolocalization
  'ar': require('./ar.json'),
  'bg': require('./bg.json'),
  'ca': require('./ca.json'),
  'cs': require('./cs.json'),
  'da': require('./da.json'),
  'de': require('./de.json'), // de-AT, de-CH identical, so they fall back into de
  'el': require('./el.json'),
  'en-XA': require('./en-XA.json'), // psuedolocalization
  'es': require('./es.json'),
  'fi': require('./fi.json'),
  'fil': require('./fil.json'),
  'fr': require('./fr.json'), // fr-CH identical, so it falls back into fr
  'hi': require('./hi.json'),
  'hr': require('./hr.json'),
  'hu': require('./hu.json'),
  'id': require('./id.json'),
  'it': require('./it.json'),
  'iw': require('./iw.json'),
  'ja': require('./ja.json'),
  'ko': require('./ko.json'),
  'lt': require('./lt.json'),
  'lv': require('./lv.json'),
  'nl': require('./nl.json'),
  'no': require('./no.json'),
  'pl': require('./pl.json'),
  'pt-PT': require('./pt-PT.json'),
  'pt': require('./pt.json'), // pt-BR identical, so it falls back into pt
  'ro': require('./ro.json'),
  'ru': require('./ru.json'),
  'sk': require('./sk.json'),
  'sl': require('./sl.json'),
  'sr': require('./sr.json'),
  'sv': require('./sv.json'),
  'ta': require('./ta.json'),
  'te': require('./te.json'),
  'th': require('./th.json'),
  'tr': require('./tr.json'),
  'uk': require('./uk.json'),
  'vi': require('./vi.json'),
  'zh-CN': require('./zh-CN.json'),
  'zh-HK': require('./zh-HK.json'),
  'zh-TW': require('./zh-TW.json'),
};

module.exports = locales;
