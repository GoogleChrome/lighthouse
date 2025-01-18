/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from './report-utils.js';

/** @typedef {import('./i18n-formatter').I18nFormatter} I18nFormatter */

let svgSuffix = 0;

class Globals {
  /** @type {I18nFormatter} */
  // @ts-expect-error: Set in report renderer.
  static i18n = null;

  /** @type {typeof UIStrings} */
  // @ts-expect-error: Set in report renderer.
  static strings = {};

  /** @type {LH.ReportResult | null} */
  static reportJson = null;

  /**
   * @param {{providedStrings: Record<string, string>; i18n: I18nFormatter; reportJson: LH.ReportResult | null}} options
   */
  static apply(options) {
    Globals.strings = {
      // Set missing renderer strings to default (english) values.
      ...UIStrings,
      ...options.providedStrings,
    };
    Globals.i18n = options.i18n;
    Globals.reportJson = options.reportJson;
  }

  static getUniqueSuffix() {
    return svgSuffix++;
  }

  static resetUniqueSuffix() {
    svgSuffix = 0;
  }
}

export {
  Globals,
};
