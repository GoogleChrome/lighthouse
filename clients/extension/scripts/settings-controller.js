/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const BACKENDS = [{
  id: 'psi',
  title: 'PSI Frontend (pagespeed.web.dev)',
}, {
  id: 'viewer',
  title: 'Lighthouse Viewer (googlechrome.github.io)',
}];

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
}];

/** @typedef {{backend: string, selectedCategories: string[], device: string, locale: string}} Settings */

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

  // Stash backend setting.
  storage[STORAGE_KEYS.Settings].backend = settings.backend;

  storage[STORAGE_KEYS.Settings].locale = settings.locale;

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
        backend: savedSettings.backend ?? 'psi',
        device: savedSettings.device,
        locale: savedSettings.locale ?? navigator.language,
        selectedCategories: Object.keys(savedCategories).filter(cat => savedCategories[cat]),
      });
    });
  });
}

export {
  BACKENDS,
  DEFAULT_CATEGORIES,
  STORAGE_KEYS,
  saveSettings,
  loadSettings,
};
