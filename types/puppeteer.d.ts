/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as puppeteerCore from 'puppeteer-core';

/**
 * @fileoverview Lighthouse should be compatible with puppeteer and puppeteer-core even though the types can be slightly different between the two packages.
 * Anytime we want to use a Puppeteer type within Lighthouse, we should pull the union type from here rather than one of the packages directly.
 */

type IfNotAny<T> = [T & 0] extends [1] ? never : T;

declare module Puppeteer {
  // @ts-ignore Puppeteer is an optional dependency. `IfNotAny` will handle the `any` type if it's not installed.
  export type Browser = puppeteerCore.Browser | IfNotAny<import('puppeteer').Browser>;
  // @ts-ignore Puppeteer is an optional dependency. `IfNotAny` will handle the `any` type if it's not installed.
  export type Page = puppeteerCore.Page | IfNotAny<import('puppeteer').Page>;
  // @ts-ignore Puppeteer is an optional dependency. `IfNotAny` will handle the `any` type if it's not installed.
  export type CDPSession = puppeteerCore.CDPSession | IfNotAny<import('puppeteer').CDPSession>;
  // @ts-ignore Puppeteer is an optional dependency. `IfNotAny` will handle the `any` type if it's not installed.
  export type Connection = puppeteerCore.Connection | IfNotAny<import('puppeteer').Connection>;
}

export default Puppeteer;
