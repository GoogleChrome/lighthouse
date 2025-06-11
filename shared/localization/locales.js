/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * Define message file to be used for a given locale. A few aliases are defined below.
 *
 * Google locale inheritance rules: https://goto.google.com/ccssm
 * CLDR language aliases: https://www.unicode.org/cldr/charts/latest/supplemental/aliases.html
 * CLDR locale inheritance: https://github.com/unicode-cldr/cldr-core/blob/master/supplemental/parentLocales.json
 *
 * For Lighthouse bundles that shouldn't include locale data, the recommended pattern
 * is to replace the default export of this file with `{}` so that no locale messages
 * are included. Strings will work normally through the IcuMessage.formattedDefault
 * fallback, and locale messages can be added on demand (e.g. dynamically fetched)
 * through `format.registerLocaleData()`.
 */

// TODO(paulirish): Centralize locale inheritance (combining this & i18n.lookupLocale()), adopt cldr parentLocale rules.

import ar from './locales/ar.json' with { type: 'json' };
import arXB from './locales/ar-XB.json' with { type: 'json' };
import bg from './locales/bg.json' with { type: 'json' };
import ca from './locales/ca.json' with { type: 'json'};
import cs from './locales/cs.json' with { type: 'json'};
import da from './locales/da.json' with { type: 'json'};
import de from './locales/de.json' with { type: 'json'};
import el from './locales/el.json' with { type: 'json'};
import enGB from './locales/en-GB.json' with { type: 'json'};
import enUS from './locales/en-US.json' with { type: 'json'};
import enXA from './locales/en-XA.json' with { type: 'json'};
import enXL from './locales/en-XL.json' with { type: 'json'};
import es from './locales/es.json' with { type: 'json'};
import es419 from './locales/es-419.json' with { type: 'json'};
import fi from './locales/fi.json' with { type: 'json'};
import fil from './locales/fil.json' with { type: 'json'};
import fr from './locales/fr.json' with { type: 'json'};
import he from './locales/he.json' with { type: 'json'};
import hi from './locales/hi.json' with { type: 'json'};
import hr from './locales/hr.json' with { type: 'json'};
import hu from './locales/hu.json' with { type: 'json'};
import id from './locales/id.json' with { type: 'json'};
import it from './locales/it.json' with { type: 'json'};
import ja from './locales/ja.json' with { type: 'json'};
import ko from './locales/ko.json' with { type: 'json'};
import lt from './locales/lt.json' with { type: 'json'};
import lv from './locales/lv.json' with { type: 'json'};
import nl from './locales/nl.json' with { type: 'json'};
import no from './locales/no.json' with { type: 'json'};
import pl from './locales/pl.json' with { type: 'json'};
import pt from './locales/pt.json' with { type: 'json'};
import ptPT from './locales/pt-PT.json' with { type: 'json'};
import ro from './locales/ro.json' with { type: 'json'};
import ru from './locales/ru.json' with { type: 'json'};
import sk from './locales/sk.json' with { type: 'json'};
import sl from './locales/sl.json' with { type: 'json'};
import sr from './locales/sr.json' with { type: 'json'};
import srLatn from './locales/sr-Latn.json' with { type: 'json'};
import sv from './locales/sv.json' with { type: 'json'};
import ta from './locales/ta.json' with { type: 'json'};
import te from './locales/te.json' with { type: 'json'};
import th from './locales/th.json' with { type: 'json'};
import tr from './locales/tr.json' with { type: 'json'};
import uk from './locales/uk.json' with { type: 'json'};
import vi from './locales/vi.json' with { type: 'json'};
import zh from './locales/zh.json' with { type: 'json'};
import zhHK from './locales/zh-HK.json' with { type: 'json'};
import zhTW from './locales/zh-TW.json' with { type: 'json'};

/** @typedef {import('../../types/lhr/settings').Locale} Locale */
/** @typedef {Record<string, {message: string}>} LhlMessages */

// The keys within this const must exactly match the LH.Locale type in externs.d.ts
/** @type {Record<Locale, LhlMessages>} */
const locales = {
  'en-US': enUS, // The 'source' strings, with descriptions
  'en': enUS, // According to CLDR/ICU, 'en' == 'en-US' dates/numbers (Why?!)

  // TODO: en-GB has just ~10 messages that are different from en-US. We should only ship those.
  'en-AU': enGB, // Alias of 'en-GB'
  'en-GB': enGB, // Alias of 'en-GB'
  'en-IE': enGB, // Alias of 'en-GB'
  'en-SG': enGB, // Alias of 'en-GB'
  'en-ZA': enGB, // Alias of 'en-GB'
  'en-IN': enGB, // Alias of 'en-GB'

  // All locales from here have a messages file, though we allow fallback to the base locale when the files are identical
  'ar-XB': arXB, // psuedolocalization
  'ar': ar,
  'bg': bg,
  'ca': ca,
  'cs': cs,
  'da': da,
  'de': de, // de-AT, de-CH identical, so they fall back into de
  'el': el,
  'en-XA': enXA, // psuedolocalization
  'en-XL': enXL, // local psuedolocalization
  'es': es,
  'es-419': es419,
  // Aliases of es-419: https://raw.githubusercontent.com/unicode-cldr/cldr-core/master/supplemental/parentLocales.json
  'es-AR': es419,
  'es-BO': es419,
  'es-BR': es419,
  'es-BZ': es419,
  'es-CL': es419,
  'es-CO': es419,
  'es-CR': es419,
  'es-CU': es419,
  'es-DO': es419,
  'es-EC': es419,
  'es-GT': es419,
  'es-HN': es419,
  'es-MX': es419,
  'es-NI': es419,
  'es-PA': es419,
  'es-PE': es419,
  'es-PR': es419,
  'es-PY': es419,
  'es-SV': es419,
  'es-US': es419,
  'es-UY': es419,
  'es-VE': es419,

  'fi': fi,
  'fil': fil,
  'fr': fr, // fr-CH identical, so it falls back into fr
  'he': he,
  'hi': hi,
  'hr': hr,
  'hu': hu,
  'gsw': de, // swiss german. identical (for our purposes) to 'de'
  'id': id,
  'in': id, // Alias of 'id'
  'it': it,
  'iw': he, // Alias of 'he'
  'ja': ja,
  'ko': ko,
  'lt': lt,
  'lv': lv,
  'mo': ro, // Alias of 'ro'
  'nl': nl,
  'nb': no, // Alias of 'no'
  'no': no,
  'pl': pl,
  'pt': pt, // pt-BR identical, so it falls back into pt
  'pt-PT': ptPT,
  'ro': ro,
  'ru': ru,
  'sk': sk,
  'sl': sl,
  'sr': sr,
  'sr-Latn': srLatn,
  'sv': sv,
  'ta': ta,
  'te': te,
  'th': th,
  'tl': fil, // Alias of 'fil'
  'tr': tr,
  'uk': uk,
  'vi': vi,
  'zh': zh, // aka ZH-Hans, sometimes seen as zh-CN, zh-Hans-CN, Simplified Chinese
  'zh-HK': zhHK, // aka zh-Hant-HK. Note: yue-Hant-HK is not supported.
  'zh-TW': zhTW, // aka zh-Hant, zh-Hant-TW, Traditional Chinese
};

export {locales};
