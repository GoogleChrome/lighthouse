/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Stricter querySelector/querySelectorAll using typed-query-selector.
 */

import {ParseSelectorToTagNames} from 'typed-query-selector/parser.js';

/** Merge properties of the types in union `T`. Where properties overlap, property types becomes the union of the two (or more) possible types. */
type MergeTypes<T> = {
  [K in (T extends unknown ? keyof T : never)]: T extends Record<K, infer U> ? U : never;
};

// Helper types for strict querySelector/querySelectorAll that includes the overlap
// between HTML and SVG node names (<a>, <script>, etc).
// see https://github.com/GoogleChrome/lighthouse/issues/12011
type HtmlAndSvgElementTagNameMap = MergeTypes<HTMLElementTagNameMap|SVGElementTagNameMap> & {
  // Fall back to Element (base of HTMLElement and SVGElement) if no specific tag name matches.
  [id: string]: Element;
};
type QuerySelectorParse<I extends string> = ParseSelectorToTagNames<I> extends infer TagNames ?
  TagNames extends string ?
    HtmlAndSvgElementTagNameMap[TagNames] :
    Element: // Fall back for queries typed-query-selector fails to parse, e.g. `'[alt], [aria-label]'`.
  never;

declare global {
  interface ParentNode {
    querySelector<S extends string>(selector: S): QuerySelectorParse<S> | null;
    querySelectorAll<S extends string>(selector: S): NodeListOf<QuerySelectorParse<S>>;
  }
}
