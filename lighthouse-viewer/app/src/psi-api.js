/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{lighthouseResult?: LH.Result, error?: {message: string}}} PSIResponse */

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_KEY = 'AIzaSyAjcDRNN9CX9dCazhqI4lGR7yyQbkd_oYE';
const PSI_DEFAULT_CATEGORIES = [
  'performance',
  'accessibility',
  'seo',
  'best-practices',
  'pwa',
];

/**
 * @typedef PSIParams
 * @property {string} url
 * @property {string[]=} category
 * @property {string=} locale
 * @property {string=} strategy
 * @property {string=} utm_source
 */

/**
 * Wrapper around the PSI API for fetching LHR.
 */
class PSIApi {
  /**
   * @param {PSIParams} params
   * @return {Promise<PSIResponse>}
   */
  fetchPSI(params) {
    const apiUrl = new URL(PSI_URL);
    // eslint-disable-next-line prefer-const
    for (let [name, value] of Object.entries(params)) {
      if (Array.isArray(value)) continue;
      if (name === 'strategy') value = value || 'mobile';
      if (typeof value !== 'undefined') apiUrl.searchParams.append(name, value);
    }
    for (const singleCategory of (params.category || PSI_DEFAULT_CATEGORIES)) {
      apiUrl.searchParams.append('category', singleCategory);
    }
    apiUrl.searchParams.append('key', PSI_KEY);
    return fetch(apiUrl.href).then(res => res.json());
  }
}

// node export for testing.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PSIApi;
  module.exports.PSI_DEFAULT_CATEGORIES = PSI_DEFAULT_CATEGORIES;
}
