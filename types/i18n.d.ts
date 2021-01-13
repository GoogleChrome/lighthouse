/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import Util = require('../lighthouse-core/report/html/renderer/util.js');

declare global {
  module LH {
    export type Locale = 'en-US'|'en'|'en-AU'|'en-GB'|'en-IE'|'en-SG'|'en-ZA'|'en-IN'|'ar-XB'|'ar'|'bg'|'ca'|'cs'|'da'|'de'|'el'|'en-XA'|'en-XL'|'es'|'es-419'|'es-AR'|'es-BO'|'es-BR'|'es-BZ'|'es-CL'|'es-CO'|'es-CR'|'es-CU'|'es-DO'|'es-EC'|'es-GT'|'es-HN'|'es-MX'|'es-NI'|'es-PA'|'es-PE'|'es-PR'|'es-PY'|'es-SV'|'es-US'|'es-UY'|'es-VE'|'fi'|'fil'|'fr'|'he'|'hi'|'hr'|'hu'|'gsw'|'id'|'in'|'it'|'iw'|'ja'|'ko'|'lt'|'lv'|'mo'|'nl'|'nb'|'no'|'pl'|'pt'|'pt-PT'|'ro'|'ru'|'sk'|'sl'|'sr'|'sr-Latn'|'sv'|'ta'|'te'|'th'|'tl'|'tr'|'uk'|'vi'|'zh'|'zh-HK'|'zh-TW';
    
    export type LocaleConfig = Record<Locale, Record<string, {message: string}>>

    export type IcuMessage = {
      // NOTE: `i18nId` rather than just `id` to make tsc typing easier (vs type branding which won't survive JSON roundtrip).
      /** The id locating this message in the locale message json files. */
      i18nId: string;
      /** The dynamic values, if any, to insert into the localized string. */
      values?: Record<string, string | number>;
      /**
       * A formatted version of the string, usually as found in a file's `UIStrings`
       * entry, and used as backup if the `i18nId` doesn't refer to an existing
       * message in the requested locale. Used when serialized and a new version of
       * Lighthouse no longer contains the needed message (or in development and
       * the locale files don't yet contain it).
       */
      formattedDefault: string,
    };

    /**
     * A helper to represent the type of an object that hasn't be localized yet.
     * Recursively finds all `string` properties in `T` and extends them to also
     * accept an `LH.IcuMessage`.
     *
     * Heavy handed and requires more type checks, so prefer explicitly setting
     * properties to include `LH.IcuMessage` over this helper if possible.
     */
    type RawIcu<T> = T extends IcuMessage ? T :
      // Check `string extends T` so LH.IcuMessage isn't added to union of string literals.
      string extends T ? (T|IcuMessage) :
      // Otherwise recurse into any properties and repeat.
      {[K in keyof T]: RawIcu<T[K]>};

    /**
     * A helper to represent the localization process, recursively finding all
     * `LH.IcuMessage` properties in `T` and replacing them with `string`.
     *
     * Essentially undoes `LH.RawIcu<T>`, but as with that type, prefer using types
     * with explicit `string` properties over this helper if possible.
     */
    type FormattedIcu<T> = T extends IcuMessage ?
      // All LH.IcuMessages replaced with strings.
      Exclude<T, IcuMessage> | string :
      // Otherwise recurse into any properties and repeat.
      {[K in keyof T]: FormattedIcu<T[K]>};

    /**
     * Info about an `LH.IcuMessage` value that was localized to a string. Value
     * is either a
     *  - path (`_.set()` style) into the original object where the message was replaced
     *  - those paths and a set of values that were inserted into the localized strings.
     */
    type IcuMessagePath = string | {path: string, values: Record<string, string | number>};

    /**
     * A representation of `LH.IcuMessage`s that were in an object (e.g. `LH.Result`)
     * and have been replaced by localized strings. `LH.IcuMessagePaths` provides a
     * mapping that can be used to change the locale of the object again.
     * Keyed by ids from the locale message json files, values are information on
     * how to replace the string if needed.
     */
    export interface IcuMessagePaths {
      [i18nId: string]: IcuMessagePath[];
    }

    /** Localized strings for the html report renderer. */
    export type I18NRendererStrings = typeof Util['UIStrings'];
  }
}

// empty export to keep file a module
export {}
