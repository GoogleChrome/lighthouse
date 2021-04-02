/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const DEFAULT_LOCALE = 'en';

/**
 * Gets annotations localization for a given locale
 * @param {string|undefined} locale
 * @returns {LH.SchemaramaStructuredData.LocalizedAnnotations}
 */

/** @type Object.<string, {annotations: LH.SchemaramaStructuredData.LocalizedAnnotations, messages: LH.SchemaramaStructuredData.LocalizedMessages}> */
const locales = {
  'en': {
    annotations: require('../assets/localization/annotations/en.json'),
    messages: require('../assets/localization/messages/en.json'),
  },
  'ru': {
    annotations: require('../assets/localization/annotations/ru.json'),
    messages: require('../assets/localization/messages/ru.json'),
  },
};

/**
 * Get messages localization for a given locale
 * @param {string|undefined} locale
 * @returns {LH.SchemaramaStructuredData.LocalizedAnnotations}
 */
function getAnnotations(locale = undefined) {
  locale = locale || DEFAULT_LOCALE;
  return locales[locale].annotations;
}

/**
 * Get messages localization for a given locale
 * @param {string|undefined} locale
 * @returns {LH.SchemaramaStructuredData.LocalizedMessages}
 */
function getMessages(locale = undefined) {
  locale = locale || DEFAULT_LOCALE;
  return locales[locale].messages;
}

module.exports = {
  getAnnotations: getAnnotations,
  getMessages: getMessages,
};
