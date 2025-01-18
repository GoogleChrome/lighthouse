/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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
export type RawIcu<T> = T extends IcuMessage ? T :
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
export type FormattedIcu<T> = T extends IcuMessage ?
  // All LH.IcuMessages replaced with strings.
  Exclude<T, IcuMessage> | string :
  // Otherwise recurse into any properties and repeat.
  {[K in keyof T]: FormattedIcu<T[K]>};
