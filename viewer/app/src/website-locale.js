/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env browser */

/**
 * @fileoverview Display language support for the hosted Lighthouse web apps
 * (Report Viewer & Treemap). English is the default language; the visitor's
 * choice is remembered across both apps.
 */

import {DOM} from '../../../report/renderer/dom.js';
import {Logger} from '../../../report/renderer/logger.js';
import {UIStrings} from './ui-strings.js';

/** @typedef {Record<string, Record<string, string>>} LocaleStrings */

const LOCALE_STORAGE_KEY = 'lighthouse-website-locale';
const DEFAULT_LOCALE = 'en-US';

/**
 * The display languages of the website, each listed in its own language.
 * @type {Record<string, string>}
 */
const SUPPORTED_LOCALES = {
  'en-US': 'English',
  'zh-TW': '繁體中文',
  'ja': '日本語',
};

/** @type {LocaleStrings} */
let localeStrings = {};
/** @type {Record<string, string>} */
let activeStrings = {...UIStrings};
/** @type {DOM|null} */
let dom = null;

/**
 * The display locale of the website: the visitor's saved choice if there is
 * one, and English otherwise.
 * @return {string}
 */
function getWebsiteLocale() {
  try {
    const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (savedLocale && Object.prototype.hasOwnProperty.call(SUPPORTED_LOCALES, savedLocale)) {
      return savedLocale;
    }
  } catch (err) {
    // localStorage can be unavailable (e.g. blocked by the user). Fall through.
  }
  return DEFAULT_LOCALE;
}

/**
 * Remembers the visitor's display language choice.
 * @param {string} locale
 */
function setWebsiteLocale(locale) {
  if (!Object.prototype.hasOwnProperty.call(SUPPORTED_LOCALES, locale)) return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (err) {
    // Nothing worth doing if localStorage is unavailable.
  }
}

/**
 * A localized message, with `{placeholder}`s substituted from `values`.
 * @param {string} key
 * @param {Record<string, string|number>=} values
 * @return {string}
 */
function getWebsiteString(key, values = {}) {
  const defaultStrings = /** @type {Record<string, string>} */ (UIStrings);
  const message = activeStrings[key] ?? defaultStrings[key] ?? '';
  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match);
}

/**
 * Renders `message` into `element`, translating any markdown links or code
 * snippets it contains.
 * @param {Element} element
 * @param {string} message
 */
function renderMessage(element, message) {
  if (!dom) dom = new DOM(document, document.documentElement);
  element.textContent = '';
  element.append(message.includes('[') || message.includes('`') ?
    dom.convertMarkdownLinkSnippets(message) :
    message);
}

/**
 * Applies the localized strings to the page: every `[data-i18n]` element gets
 * its message, every `[data-i18n-placeholder]` element gets its placeholder,
 * and the document language is updated. Elements with unknown keys are left
 * untouched.
 * @param {string} locale
 */
function applyWebsiteStrings(locale) {
  activeStrings = {...UIStrings, ...(localeStrings[locale] || {})};
  document.documentElement.lang = locale;
  Logger.warningPrefix = getWebsiteString('warningPrefix');

  for (const element of document.querySelectorAll('[data-i18n]')) {
    const key = element.getAttribute('data-i18n');
    if (key === null || !Object.prototype.hasOwnProperty.call(UIStrings, key)) continue;
    // A shell label may live inside a report in a different language.
    element.setAttribute('lang', locale);
    renderMessage(element, activeStrings[key]);
  }

  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key === null || !Object.prototype.hasOwnProperty.call(UIStrings, key)) continue;
    element.setAttribute('placeholder', activeStrings[key]);
  }
}

/**
 * Wires up the language menu of the page (`select.js-website-locale`), if any.
 */
function initLocaleSwitcher() {
  const select = /** @type {HTMLSelectElement|null} */ (
    document.querySelector('select.js-website-locale'));
  if (!select) return;

  select.textContent = '';
  select.append(...Object.entries(SUPPORTED_LOCALES).map(([locale, name]) => {
    const option = document.createElement('option');
    option.value = locale;
    option.textContent = name;
    return option;
  }));

  select.value = getWebsiteLocale();
  select.addEventListener('change', () => {
    setWebsiteLocale(select.value);
    applyWebsiteStrings(select.value);
  });
}

/**
 * Styles the language menu. Injected so both web apps share one definition.
 */
function injectLocaleSwitcherStyles() {
  if (document.head.querySelector('style[data-website-locale]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-website-locale', '');
  style.textContent = /* css */ `
    .website-locale-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 12px 0;
      font-size: 0.9em;
    }
    .website-locale-switcher__label {
      color: #757575;
    }
    .website-locale-switcher select {
      font: inherit;
      padding: 2px 6px;
      color: inherit;
      background: #fff;
      border: 1px solid #c6c6c6;
      border-radius: 4px;
    }
  `;
  document.head.append(style);
}

/**
 * Localizes the website: renders all shell strings in the display locale and
 * connects the language menu.
 * @param {LocaleStrings} strings Localized strings for every supported locale,
 *     keyed as in the localization files (e.g. `{'zh-TW': {...}, ...}`).
 */
function initWebsiteI18n(strings) {
  localeStrings = strings;
  injectLocaleSwitcherStyles();
  initLocaleSwitcher();
  applyWebsiteStrings(getWebsiteLocale());
}

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  applyWebsiteStrings,
  getWebsiteLocale,
  getWebsiteString,
  initWebsiteI18n,
  setWebsiteLocale,
};
