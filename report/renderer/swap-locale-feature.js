/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Creates a <select> element, filled with all supported locales
 */

/** @typedef {import('./dom.js').DOM} DOM */
/** @typedef {import('./report-ui-features').ReportUIFeatures} ReportUIFeatures */

export class SwapLocaleFeature {
  /**
   * @param {ReportUIFeatures} reportUIFeatures
   * @param {DOM} dom
   * @param {{onLocaleSelected: (localeModuleName: LH.Locale) => Promise<void>}} callbacks
   *        Specifiy the URL where the i18n module script can be found, and the URLS for the locale JSON files.
   */
  constructor(reportUIFeatures, dom, callbacks) {
    this._reportUIFeatures = reportUIFeatures;
    this._dom = dom;
    this._localeSelectedCallback = callbacks.onLocaleSelected;
  }

  /**
   * @param {Array<LH.Locale>} locales
   */
  enable(locales) {
    if (!this._reportUIFeatures.json.i18n.icuMessagePaths) {
      throw new Error('missing icuMessagePaths');
    }

    this._dom.find('.lh-tools-locale', this._dom.rootEl).classList.remove('lh-hidden');

    const currentLocale = this._reportUIFeatures.json.configSettings.locale;

    const containerEl = this._dom.find('.lh-tools-locale__selector-wrapper', this._dom.rootEl);
    containerEl.removeAttribute('aria-hidden');
    const selectEl = this._dom.createChildOf(containerEl, 'select', 'lh-locale-selector');
    selectEl.name = 'lh-locale-list';
    selectEl.setAttribute('role', 'menuitem');

    const toggleEl = this._dom.find('.lh-tool-locale__button', this._dom.rootEl);
    toggleEl.addEventListener('click', () => {
      toggleEl.classList.toggle('lh-active');
    });

    for (const locale of locales) {
      const optionEl = this._dom.createChildOf(selectEl, 'option', '');
      optionEl.value = locale;
      if (locale === currentLocale) optionEl.selected = true;

      if (window.Intl && Intl.DisplayNames) {
        const currentLocaleDisplay = new Intl.DisplayNames([currentLocale], {type: 'language'});
        const optionLocaleDisplay = new Intl.DisplayNames([locale], {type: 'language'});

        const optionLocaleName = optionLocaleDisplay.of(locale);
        const currentLocaleName = currentLocaleDisplay.of(locale) || locale;
        if (optionLocaleName && optionLocaleName !== currentLocaleName) {
          optionEl.textContent = `${optionLocaleName} – ${currentLocaleName}`;
        } else {
          optionEl.textContent = currentLocaleName;
        }
      } else {
        optionEl.textContent = locale;
      }
    }

    selectEl.addEventListener('change', () => {
      const locale = /** @type {LH.Locale} */ (selectEl.value);
      this._localeSelectedCallback(locale);
    });
  }
}
