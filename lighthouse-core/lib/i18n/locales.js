/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * Define message file to be used for a given locale. A few aliases are defined below.
 *
 * Google locale inheritance rules: https://goto.google.com/ccssm
 * CLDR language aliases: https://www.unicode.org/cldr/charts/latest/supplemental/aliases.html
 * CLDR locale inheritance: https://github.com/unicode-cldr/cldr-core/blob/master/supplemental/parentLocales.json
 */

// TODO(paulirish): Centralize locale inheritance (combining this & i18n.lookupLocale()), adopt cldr parentLocale rules.

/** @typedef {Record<string, {message: string}>} LhlMessages */

const fs = require('fs');

/** @type {Record<string, LhlMessages>} */
const l = {
  'ar': JSON.parse(fs.readFileSync(`${__dirname}/locales/ar.json`, 'utf8')),
  'ar-XB': JSON.parse(fs.readFileSync(`${__dirname}/locales/ar-XB.json`, 'utf8')),
  'bg': JSON.parse(fs.readFileSync(`${__dirname}/locales/bg.json`, 'utf8')),
  'ca': JSON.parse(fs.readFileSync(`${__dirname}/locales/ca.json`, 'utf8')),
  'cs': JSON.parse(fs.readFileSync(`${__dirname}/locales/cs.json`, 'utf8')),
  'da': JSON.parse(fs.readFileSync(`${__dirname}/locales/da.json`, 'utf8')),
  'de': JSON.parse(fs.readFileSync(`${__dirname}/locales/de.json`, 'utf8')),
  'el': JSON.parse(fs.readFileSync(`${__dirname}/locales/el.json`, 'utf8')),
  'en-GB': JSON.parse(fs.readFileSync(`${__dirname}/locales/en-GB.json`, 'utf8')),
  'en-US': JSON.parse(fs.readFileSync(`${__dirname}/locales/en-US.json`, 'utf8')),
  'en-XA': JSON.parse(fs.readFileSync(`${__dirname}/locales/en-XA.json`, 'utf8')),
  'en-XL': JSON.parse(fs.readFileSync(`${__dirname}/locales/en-XL.json`, 'utf8')),
  'es': JSON.parse(fs.readFileSync(`${__dirname}/locales/es.json`, 'utf8')),
  'es-419': JSON.parse(fs.readFileSync(`${__dirname}/locales/es-419.json`, 'utf8')),
  'fi': JSON.parse(fs.readFileSync(`${__dirname}/locales/fi.json`, 'utf8')),
  'fil': JSON.parse(fs.readFileSync(`${__dirname}/locales/fil.json`, 'utf8')),
  'fr': JSON.parse(fs.readFileSync(`${__dirname}/locales/fr.json`, 'utf8')),
  'he': JSON.parse(fs.readFileSync(`${__dirname}/locales/he.json`, 'utf8')),
  'hi': JSON.parse(fs.readFileSync(`${__dirname}/locales/hi.json`, 'utf8')),
  'hr': JSON.parse(fs.readFileSync(`${__dirname}/locales/hr.json`, 'utf8')),
  'hu': JSON.parse(fs.readFileSync(`${__dirname}/locales/hu.json`, 'utf8')),
  'id': JSON.parse(fs.readFileSync(`${__dirname}/locales/id.json`, 'utf8')),
  'it': JSON.parse(fs.readFileSync(`${__dirname}/locales/it.json`, 'utf8')),
  'ja': JSON.parse(fs.readFileSync(`${__dirname}/locales/ja.json`, 'utf8')),
  'ko': JSON.parse(fs.readFileSync(`${__dirname}/locales/ko.json`, 'utf8')),
  'lt': JSON.parse(fs.readFileSync(`${__dirname}/locales/lt.json`, 'utf8')),
  'lv': JSON.parse(fs.readFileSync(`${__dirname}/locales/lv.json`, 'utf8')),
  'nl': JSON.parse(fs.readFileSync(`${__dirname}/locales/nl.json`, 'utf8')),
  'no': JSON.parse(fs.readFileSync(`${__dirname}/locales/no.json`, 'utf8')),
  'pl': JSON.parse(fs.readFileSync(`${__dirname}/locales/pl.json`, 'utf8')),
  'pt': JSON.parse(fs.readFileSync(`${__dirname}/locales/pt.json`, 'utf8')),
  'pt-PT': JSON.parse(fs.readFileSync(`${__dirname}/locales/pt-PT.json`, 'utf8')),
  'ro': JSON.parse(fs.readFileSync(`${__dirname}/locales/ro.json`, 'utf8')),
  'ru': JSON.parse(fs.readFileSync(`${__dirname}/locales/ru.json`, 'utf8')),
  'sk': JSON.parse(fs.readFileSync(`${__dirname}/locales/sk.json`, 'utf8')),
  'sl': JSON.parse(fs.readFileSync(`${__dirname}/locales/sl.json`, 'utf8')),
  'sr': JSON.parse(fs.readFileSync(`${__dirname}/locales/sr.json`, 'utf8')),
  'sr-Latn': JSON.parse(fs.readFileSync(`${__dirname}/locales/sr-Latn.json`, 'utf8')),
  'sv': JSON.parse(fs.readFileSync(`${__dirname}/locales/sv.json`, 'utf8')),
  'ta': JSON.parse(fs.readFileSync(`${__dirname}/locales/ta.json`, 'utf8')),
  'te': JSON.parse(fs.readFileSync(`${__dirname}/locales/te.json`, 'utf8')),
  'th': JSON.parse(fs.readFileSync(`${__dirname}/locales/th.json`, 'utf8')),
  'tr': JSON.parse(fs.readFileSync(`${__dirname}/locales/tr.json`, 'utf8')),
  'uk': JSON.parse(fs.readFileSync(`${__dirname}/locales/uk.json`, 'utf8')),
  'vi': JSON.parse(fs.readFileSync(`${__dirname}/locales/vi.json`, 'utf8')),
  'zh': JSON.parse(fs.readFileSync(`${__dirname}/locales/zh.json`, 'utf8')),
  'zh-HK': JSON.parse(fs.readFileSync(`${__dirname}/locales/zh-HK.json`, 'utf8')),
  'zh-TW': JSON.parse(fs.readFileSync(`${__dirname}/locales/zh-TW.json`, 'utf8')),
};

// The keys within this const must exactly match the LH.Locale type in externs.d.ts
/** @type {Record<LH.Locale, LhlMessages>} */
const locales = {
  'en-US': l['en-US'], // The 'source' strings, with descriptions
  'en': l['en-US'], // According to CLDR/ICU, 'en' == 'en-US' dates/numbers (Why?!)

  // TODO: en-GB has just ~10 messages that are different from en-US. We should only ship those.
  'en-AU': l['en-GB'], // Alias of 'en-GB'
  'en-GB': l['en-GB'], // Alias of 'en-GB'
  'en-IE': l['en-GB'], // Alias of 'en-GB'
  'en-SG': l['en-GB'], // Alias of 'en-GB'
  'en-ZA': l['en-GB'], // Alias of 'en-GB'
  'en-IN': l['en-GB'], // Alias of 'en-GB'

  // All locales from here have a messages file, though we allow fallback to the base locale when the files are identical
  'ar-XB': l['ar-XB'], // psuedolocalization
  'ar': l['ar'],
  'bg': l['bg'],
  'ca': l['ca'],
  'cs': l['cs'],
  'da': l['da'],
  'de': l['de'], // de-AT, de-CH identical, so they fall back into de
  'el': l['el'],
  'en-XA': l['en-XA'], // psuedolocalization
  'en-XL': l['en-XL'], // local psuedolocalization
  'es': l['es'],
  'es-419': l['es-419'],
  // Aliases of es-419: https://raw.githubusercontent.com/unicode-cldr/cldr-core/master/supplemental/parentLocales.json
  'es-AR': l['es-419'],
  'es-BO': l['es-419'],
  'es-BR': l['es-419'],
  'es-BZ': l['es-419'],
  'es-CL': l['es-419'],
  'es-CO': l['es-419'],
  'es-CR': l['es-419'],
  'es-CU': l['es-419'],
  'es-DO': l['es-419'],
  'es-EC': l['es-419'],
  'es-GT': l['es-419'],
  'es-HN': l['es-419'],
  'es-MX': l['es-419'],
  'es-NI': l['es-419'],
  'es-PA': l['es-419'],
  'es-PE': l['es-419'],
  'es-PR': l['es-419'],
  'es-PY': l['es-419'],
  'es-SV': l['es-419'],
  'es-US': l['es-419'],
  'es-UY': l['es-419'],
  'es-VE': l['es-419'],

  'fi': l['fi'],
  'fil': l['fil'],
  'fr': l['fr'], // fr-CH identical, so it falls back into fr
  'he': l['he'],
  'hi': l['hi'],
  'hr': l['hr'],
  'hu': l['hu'],
  'gsw': l['de'], // swiss german. identical (for our purposes) to 'de'
  'id': l['id'],
  'in': l['id'], // Alias of 'id'
  'it': l['it'],
  'iw': l['he'], // Alias of 'he'
  'ja': l['ja'],
  'ko': l['ko'],
  'lt': l['lt'],
  'lv': l['lv'],
  'mo': l['ro'], // Alias of 'ro'
  'nl': l['nl'],
  'nb': l['no'], // Alias of 'no'
  'no': l['no'],
  'pl': l['pl'],
  'pt': l['pt'], // pt-BR identical, so it falls back into pt
  'pt-PT': l['pt-PT'],
  'ro': l['ro'],
  'ru': l['ru'],
  'sk': l['sk'],
  'sl': l['sl'],
  'sr': l['sr'],
  'sr-Latn': l['sr-Latn'],
  'sv': l['sv'],
  'ta': l['ta'],
  'te': l['te'],
  'th': l['th'],
  'tl': l['fil'], // Alias of 'fil'
  'tr': l['tr'],
  'uk': l['uk'],
  'vi': l['vi'],
  'zh': l['zh'], // aka ZH-Hans, sometimes seen as zh-CN, zh-Hans-CN, Simplified Chinese
  'zh-HK': l['zh-HK'], // aka zh-Hant-HK. Note: yue-Hant-HK is not supported.
  'zh-TW': l['zh-TW'], // aka zh-Hant, zh-Hant-TW, Traditional Chinese
};

module.exports = locales;
