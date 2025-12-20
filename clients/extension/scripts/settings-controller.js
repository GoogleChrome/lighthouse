/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// Manually define the default categories, instead of bundling a lot of i18n code.
const DEFAULT_CATEGORIES = [{
  id: 'performance',
  title: 'Performance',
}, {
  id: 'accessibility',
  title: 'Accessibility',
}, {
  id: 'best-practices',
  title: 'Best Practices',
}, {
  id: 'seo',
  title: 'SEO',
}, {
  id: 'pwa',
  title: 'Progressive Web App',
}];

/** @typedef {{selectedCategories: string[], device: string}} Settings */

const STORAGE_KEYS = {
  Categories: 'lighthouse_audits',
  Settings: 'lighthouse_settings',
};

/**
 * Save currently selected set of category categories to local storage.
 * @param {Settings} settings
 */
function saveSettings(settings) {
  const storage = {
    /** @type {Record<string, boolean>} */
    [STORAGE_KEYS.Categories]: {},
    /** @type {Record<string, string>} */
    [STORAGE_KEYS.Settings]: {},
  };

  // Stash selected categories.
  DEFAULT_CATEGORIES.forEach(category => {
    const enabled = settings.selectedCategories.includes(category.id);
    storage[STORAGE_KEYS.Categories][category.id] = enabled;
  });

  // Stash device setting.
  storage[STORAGE_KEYS.Settings].device = settings.device;

  // Save object to chrome local storage.
  chrome.storage.local.set(storage);
}

/**
 * Load selected category categories from local storage.
 * @return {Promise<Settings>}
 */
function loadSettings() {
  return new Promise(resolve => {
    // Protip: debug what's in storage with:
    //   chrome.storage.local.get(['lighthouse_audits'], console.log)
    chrome.storage.local.get([STORAGE_KEYS.Categories, STORAGE_KEYS.Settings], result => {
      // Start with list of all default categories set to true so list is
      // always up to date.
      /** @type {Record<string, boolean>} */
      const defaultCategories = {};
      DEFAULT_CATEGORIES.forEach(category => {
        defaultCategories[category.id] = true;
      });

      // Load saved categories and settings, overwriting defaults with any
      // saved selections.
      const savedCategories = {...defaultCategories, ...result[STORAGE_KEYS.Categories]};

      const defaultSettings = {
        device: 'mobile',
      };
      const savedSettings = {...defaultSettings, ...result[STORAGE_KEYS.Settings]};

      resolve({
        device: savedSettings.device,
        selectedCategories: Object.keys(savedCategories).filter(cat => savedCategories[cat]),
      });
    });
  });
}

module.exports = {
  DEFAULT_CATEGORIES,
  STORAGE_KEYS,
  saveSettings,
  loadSettings,
};
