/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as SettingsController from './settings-controller.js';
import {DOM} from '../../../report/renderer/dom.js';

const dom = new DOM(document, document.documentElement);

// Replaced with 'chrome' or 'firefox' in the build script.
/** @type {string} */
const BROWSER_BRAND = '___BROWSER_BRAND___';
/** @type {string[]} */
const LOCALES = JSON.parse('__LOCALES__');

const CHROME_STRINGS = {
  localhostErrorMessage: 'Use DevTools to audit pages on localhost.',
};

const FIREFOX_STRINGS = {
  localhostErrorMessage: 'Use the Lighthouse Node CLI to audit pages on localhost.',
};

const STRINGS = BROWSER_BRAND === 'chrome' ? CHROME_STRINGS : FIREFOX_STRINGS;

/**
 * @param {string} text
 * @param {string} id
 * @param {boolean} isChecked
 * @return {HTMLLIElement}
 */
function createOptionItem(text, id, isChecked) {
  const input = document.createElement('input');
  input.setAttribute('type', 'checkbox');
  input.setAttribute('value', id);
  if (isChecked) {
    input.setAttribute('checked', 'checked');
  }

  const label = document.createElement('label');
  const span = document.createElement('span');
  span.textContent = text;
  label.append(input, span);
  const listItem = document.createElement('li');
  listItem.append(label);

  return listItem;
}

/**
 * @param {string} name
 * @param {string} text
 * @param {string} id
 * @param {boolean} isChecked
 * @return {HTMLLIElement}
 */
function createRadioItem(name, text, id, isChecked) {
  const input = document.createElement('input');
  input.setAttribute('type', 'radio');
  input.setAttribute('value', id);
  input.setAttribute('name', name);
  if (isChecked) {
    input.setAttribute('checked', 'checked');
  }

  const label = document.createElement('label');
  const span = document.createElement('span');
  span.textContent = text;
  label.append(input, span);
  const listItem = document.createElement('li');
  listItem.append(label);

  return listItem;
}

/**
 * Click event handler for Generate Report button.
 * @param {string} backend
 * @param {string} url
 * @param {SettingsController.Settings} settings
 */
function onGenerateReportButtonClick(backend, url, settings) {
  let apiUrl;
  if (backend === 'psi') {
    apiUrl = new URL('https://pagespeed.web.dev/analysis');
    apiUrl.searchParams.append('url', url);
    apiUrl.searchParams.append('form_factor', settings.device);
    for (const category of settings.selectedCategories) {
      apiUrl.searchParams.append('category', category);
    }
    apiUrl.searchParams.append('hl', settings.locale);
  } else {
    apiUrl = new URL('https://googlechrome.github.io/lighthouse/viewer/');
    apiUrl.searchParams.append('psiurl', url);
    apiUrl.searchParams.append('strategy', settings.device);
    for (const category of settings.selectedCategories) {
      apiUrl.searchParams.append('category', category);
    }
    apiUrl.searchParams.append('locale', settings.locale);
  }
  apiUrl.searchParams.append('utm_source', 'lh-chrome-ext');
  window.open(apiUrl.href);
}

/**
 * Generates a document fragment containing a list of checkboxes and labels
 * for the categories.
 * @param {SettingsController.Settings} settings
 */
function generateCategoryOptionsList(settings) {
  const frag = document.createDocumentFragment();

  SettingsController.DEFAULT_CATEGORIES.forEach(category => {
    const isChecked = settings.selectedCategories.includes(category.id);
    frag.append(createOptionItem(category.title, category.id, isChecked));
  });

  const optionsCategoriesList = dom.find('.options__categories');
  optionsCategoriesList.append(frag);
}


/**
 * Generates a document fragment containing a list of backends.
 * @param {SettingsController.Settings} settings
 */
function generateBackendOptionsList(settings) {
  const frag = document.createDocumentFragment();

  SettingsController.BACKENDS.forEach(backend => {
    const isChecked = settings.backend === backend.id;
    frag.append(createRadioItem('backend', backend.title, backend.id, isChecked));
  });

  const optionsCategoriesList = dom.find('.options__backend');
  optionsCategoriesList.append(frag);
}

/**
 * From third_party/devtools-frontend/src/front_end/core/i18n/i18nImpl.ts
 *
 * Returns a string of the form:
 *   "German (Austria) - Deutsch (Österreich)"
 * where the former locale representation is written in the currently enabled DevTools
 * locale and the latter locale representation is written in the locale of `localeString`.
 *
 * Should the two locales match (i.e. have the same language) then the latter locale
 * representation is written in English.
 *
 * @param {string} localeString
 * @param {string} currentLocale
 * @return {string}
 */
function getLocalizedLanguageRegion(localeString, currentLocale) {
  const locale = new Intl.Locale(localeString);
  const localLanguage = locale.language || 'en';
  const localBaseName = locale.baseName || 'en-US';
  const devtoolsLoc = new Intl.Locale(currentLocale);
  const targetLanguage = localLanguage === devtoolsLoc.language ? 'en' : localBaseName;
  const languageInCurrentLocale =
    new Intl.DisplayNames([currentLocale], {type: 'language'}).of(localLanguage);
  const languageInTargetLocale =
    new Intl.DisplayNames([targetLanguage], {type: 'language'}).of(localLanguage);

  let wrappedRegionInCurrentLocale = '';
  let wrappedRegionInTargetLocale = '';

  if (locale.region) {
    const regionInCurrentLocale =
        new Intl.DisplayNames([currentLocale], {type: 'region', style: 'short'}).of(locale.region);
    const regionInTargetLocale =
        new Intl.DisplayNames([targetLanguage], {type: 'region', style: 'short'}).of(locale.region);
    wrappedRegionInCurrentLocale = ` (${regionInCurrentLocale})`;
    wrappedRegionInTargetLocale = ` (${regionInTargetLocale})`;
  }

  const lhs = languageInCurrentLocale + wrappedRegionInCurrentLocale;
  const rhs = languageInTargetLocale + wrappedRegionInTargetLocale;
  if (lhs === rhs) {
    return lhs;
  }

  return `${lhs} - ${rhs}`;
}

/**
 * Generates a document fragment containing a list of locale options.
 * @param {SettingsController.Settings} settings
 */
function generateLocaleOptionsList(settings) {
  const frag = document.createDocumentFragment();

  LOCALES.forEach(locale => {
    const optionEl = document.createElement('option');
    optionEl.textContent = getLocalizedLanguageRegion(locale, navigator.language);
    optionEl.value = locale;
    if (settings.locale === locale) {
      optionEl.selected = true;
    }
    frag.append(optionEl);
  });

  const optionsLocalesList = dom.find('.options__locales');
  optionsLocalesList.append(frag);
}

/**
 * @param {SettingsController.Settings} settings
 */
function configureVisibleSettings(settings) {
  const optionsCategoriesList = dom.find('.options__categories');
  optionsCategoriesList.parentElement?.classList.toggle('hidden', settings.backend === 'psi');
}

function fillDevToolsShortcut() {
  const el = dom.find('.devtools-shortcut');
  const isMac = /mac/i.test(navigator.platform);
  el.textContent = isMac ? '⌘⌥I (Cmd+Opt+I)' : 'F12';
}

/**
 * Create the settings from the state of the options form, save in storage, and return it.
 * @return {SettingsController.Settings}
 */
function readSettingsFromDomAndPersist() {
  const optionsEl = dom.find('.section--options');
  // Save settings when options page is closed.
  const backend = dom.find('.options__backend input:checked').value;
  const locale = dom.find('select.options__locales').value;
  const checkboxes = optionsEl.querySelectorAll('.options__categories input:checked');
  const selectedCategories = Array.from(checkboxes).map(input => input.value);
  const device = dom.find('input[name="device"]:checked').value;

  const settings = {
    backend,
    locale,
    selectedCategories,
    device,
  };
  SettingsController.saveSettings(settings);
  return settings;
}

/**
 * @return {Promise<URL>}
 */
function getSiteUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
      if (tabs.length === 0 || !tabs[0].url) {
        return;
      }

      const url = new URL(tabs[0].url);
      if (url.hostname === 'localhost') {
        reject(new Error(STRINGS.localhostErrorMessage));
      } else if (/^(chrome|about)/.test(url.protocol)) {
        reject(new Error(`Cannot audit ${url.protocol}// pages.`));
      } else {
        resolve(url);
      }
    });
  });
}

/**
 * Initializes the popup's state and UI elements.
 */
async function initPopup() {
  if (BROWSER_BRAND === 'chrome') {
    fillDevToolsShortcut();
  }
  const browserBrandEl = dom.find(`.browser-brand--${BROWSER_BRAND}`);
  browserBrandEl.classList.remove('hidden');

  const generateReportButton = dom.find('button.button--generate');
  const psiDisclaimerEl = dom.find('.psi-disclaimer');
  const errorMessageEl = dom.find('.errormsg');
  const optionsFormEl = dom.find('.options__form');

  /** @type {URL} */
  let siteUrl;
  /** @type {SettingsController.Settings} */
  let settings;
  try {
    siteUrl = await getSiteUrl();
    settings = await SettingsController.loadSettings();
  } catch (err) {
    // Disable everything. A navigation might allow for a working state,
    // but it's very hard to keep an extension popup alive during a popup
    // so we don't need to handle reacting to it.
    generateReportButton.disabled = true;
    psiDisclaimerEl.remove();
    errorMessageEl.textContent = err.message;
    return;
  }

  // Generate checkboxes from saved settings.
  generateBackendOptionsList(settings);
  generateCategoryOptionsList(settings);
  generateLocaleOptionsList(settings);
  configureVisibleSettings(settings);
  const selectedDeviceEl = dom.find(`.options__device input[value="${settings.device}"]`);
  selectedDeviceEl.checked = true;

  generateReportButton.addEventListener('click', () => {
    onGenerateReportButtonClick(settings.backend, siteUrl.href, settings);
  });

  optionsFormEl.addEventListener('change', () => {
    settings = readSettingsFromDomAndPersist();
    configureVisibleSettings(settings);
  });
}

initPopup();
