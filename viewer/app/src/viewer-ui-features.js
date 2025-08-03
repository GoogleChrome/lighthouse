/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('../../../report/renderer/dom').DOM} DOM */
/** @typedef {import('../../../shared/localization/locales').LhlMessages} LhlMessages */

import {ReportUIFeatures} from '../../../report/renderer/report-ui-features.js';
import {SwapLocaleFeature} from '../../../report/renderer/swap-locale-feature.js';

/**
 * Extends ReportUIFeatures to add an (optional) ability to save to a gist and
 * generates the saved report from a browserified ReportGenerator.
 */
export class ViewerUIFeatures extends ReportUIFeatures {
  /**
   * @param {DOM} dom
   * @param {{saveGist?: (json: LH.Result) => Promise<string|undefined>, refresh: function(LH.Result): void, getStandaloneReportHTML: function(): string}} callbacks
   */
  constructor(dom, callbacks) {
    super(dom, {
      getStandaloneReportHTML: callbacks.getStandaloneReportHTML,
    });

    this._saveGistCallback = callbacks.saveGist;
    this._refreshCallback = callbacks.refresh;
    this._swapLocales = new SwapLocaleFeature(this, this._dom, {
      onLocaleSelected: this._swapLocale.bind(this),
    });
  }

  /**
   * @param {LH.Result} report
   * @override
   */
  initFeatures(report) {
    super.initFeatures(report);

    // Disable option to save as gist if no callback for saving.
    if (!this._saveGistCallback) {
      const saveGistItem =
        this._dom.find('.lh-tools__dropdown a[data-action="save-gist"]', this._dom.rootEl);
      saveGistItem.setAttribute('disabled', 'true');
    }

    this._getI18nModule().then(i18nModule => {
      if (!report.i18n?.icuMessagePaths) return;

      const locales = /** @type {LH.Locale[]} */ (i18nModule.format.getCanonicalLocales());
      this._swapLocales.enable(locales);
    }).catch(err => console.error(err)); // eslint-disable-line no-console
  }

  /**
 * @override
 * Saves the report as a gist and disables the save menu option **only on success**.
 */
  async saveAsGist() {
    if (!this._saveGistCallback) {
      throw new Error('Cannot save this report as a gist');
    }

    try {
    // Await the callback which returns the gist ID string or undefined
      const gistId = await this._saveGistCallback(this.json);

      if (gistId) {
      // Disable the "Save as Gist" menu option only if save succeeded
        const saveGistItem =
        this._dom.find('.lh-tools__dropdown a[data-action="save-gist"]', this._dom.rootEl);
        saveGistItem.setAttribute('disabled', 'true');
      }
    } catch (err) {
    // Log errors but keep menu enabled for retries
    }
  }

  /**
   * @param {LH.Locale} locale
   * @return {Promise<LhlMessages>}
   */
  async _fetchLocaleMessages(locale) {
    const response = await fetch(`./locales/${locale}.json`);
    return response.json();
  }

  /**
   * @param {LH.Locale} locale
   */
  async _swapLocale(locale) {
    const lhlMessages = await this._fetchLocaleMessages(locale);
    const i18nModule = await this._getI18nModule();
    if (!lhlMessages) throw new Error(`could not fetch data for locale: ${locale}`);

    i18nModule.format.registerLocaleData(locale, lhlMessages);
    const newLhr = i18nModule.swapLocale(this.json, locale).lhr;
    this._refreshCallback(newLhr);
  }

  /**
   * The i18n module is only need for swap-locale-feature.js, and is ~30KB,
   * so it is lazily loaded.
   * TODO: reduce the size of the formatting code and include it always (remove lazy load),
   *       possibly moving into base ReportUIFeatures.
   */
  _getI18nModule() {
    return import('../../../shared/localization/i18n-module.js');
  }
}
