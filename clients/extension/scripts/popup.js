/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const SettingsController = require('./settings-controller.js');

const VIEWER_URL = 'https://googlechrome.github.io/lighthouse/viewer/';
const optionsVisibleClass = 'main--options-visible';
// Replaced with 'chrome' or 'firefox' in the build script.
/** @type {string} */
const BROWSER_BRAND = '___BROWSER_BRAND___';

const CHROME_STRINGS = {
  localhostErrorMessage: 'Use DevTools to audit pages on localhost.',
};

const FIREFOX_STRINGS = {
  localhostErrorMessage: 'Use the Lighthouse Node CLI to audit pages on localhost.',
};

const STRINGS = BROWSER_BRAND === 'chrome' ? CHROME_STRINGS : FIREFOX_STRINGS;

/**
 * Guaranteed context.querySelector. Always returns an element or throws if
 * nothing matches query.
 * @param {string} query
 * @param {ParentNode=} context
 * @return {HTMLElement}
 */
function find(query, context = document) {
  /** @type {?HTMLElement} */
  const result = context.querySelector(query);
  if (result === null) {
    throw new Error(`query ${query} not found`);
  }
  return result;
}

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
  label.appendChild(input);
  label.appendChild(document.createElement('span')).textContent = text;
  const listItem = document.createElement('li');
  listItem.appendChild(label);

  return listItem;
}

/**
 * Click event handler for Generate Report button.
 * @param {string} url
 * @param {SettingsController.Settings} settings
 */
function onGenerateReportButtonClick(url, settings) {
  const apiUrl = new URL(VIEWER_URL);
  apiUrl.searchParams.append('psiurl', url);
  apiUrl.searchParams.append('strategy', settings.device);
  for (const category of settings.selectedCategories) {
    apiUrl.searchParams.append('category', category);
  }
  apiUrl.searchParams.append('utm_source', 'lh-chrome-ext');
  window.open(apiUrl.href);
}

/**
 * Generates a document fragment containing a list of checkboxes and labels
 * for the categories.
 * @param {SettingsController.Settings} settings
 */
function generateOptionsList(settings) {
  const frag = document.createDocumentFragment();

  SettingsController.DEFAULT_CATEGORIES.forEach(category => {
    const isChecked = settings.selectedCategories.includes(category.id);
    frag.appendChild(createOptionItem(category.title, category.id, isChecked));
  });

  const optionsCategoriesList = find('.options__categories');
  optionsCategoriesList.appendChild(frag);
}

function fillDevToolsShortcut() {
  const el = find('.devtools-shortcut');
  const isMac = /mac/i.test(navigator.platform);
  el.textContent = isMac ? '⌘⌥I (Cmd+Opt+I)' : 'F12';
}

/**
 * Create the settings from the state of the options form, save in storage, and return it.
 * @returns {SettingsController.Settings}
 */
function readSettingsFromDomAndPersist() {
  const optionsEl = find('.section--options');
  // Save settings when options page is closed.
  const checkboxes = /** @type {NodeListOf<HTMLInputElement>} */
    (optionsEl.querySelectorAll('.options__categories input:checked'));
  const selectedCategories = Array.from(checkboxes).map(input => input.value);
  const device = /** @type {HTMLInputElement} */ (find('input[name="device"]:checked')).value;

  const settings = {
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
  const browserBrandEl = find(`.browser-brand--${BROWSER_BRAND}`);
  browserBrandEl.classList.remove('hidden');

  const mainEl = find('main');
  const optionsEl = find('.button--configure');
  const generateReportButton = /** @type {HTMLButtonElement} */ (find('.button--generate'));
  const configureButton = /** @type {HTMLButtonElement} */ (find('.button--configure'));
  const psiDisclaimerEl = find('.psi-disclaimer');
  const errorMessageEl = find('.errormsg');
  const optionsFormEl = find('.options__form');

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
    configureButton.disabled = true;
    psiDisclaimerEl.remove();
    errorMessageEl.textContent = err.message;
    return;
  }

  // Generate checkboxes from saved settings.
  generateOptionsList(settings);
  const selectedDeviceEl = /** @type {HTMLInputElement} */ (
    find(`.options__device input[value="${settings.device}"]`));
  selectedDeviceEl.checked = true;

  generateReportButton.addEventListener('click', () => {
    onGenerateReportButtonClick(siteUrl.href, settings);
  });

  optionsEl.addEventListener('click', () => {
    mainEl.classList.toggle(optionsVisibleClass);
  });

  optionsFormEl.addEventListener('change', () => {
    settings = readSettingsFromDomAndPersist();
  });
}

initPopup();
