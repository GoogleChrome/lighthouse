/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {{lighthouseResult?: LH.Result, error?: {message: string}}} PSIResponse */

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_KEY = 'AIzaSyAjcDRNN9CX9dCazhqI4lGR7yyQbkd_oYE';
const PSI_DEFAULT_CATEGORIES = [
  'performance',
  'accessibility',
  'seo',
  'best-practices',
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
    return fetch(apiUrl.href, {
      headers: {
        referer: 'googlechrome.github.io',
      },
    }).then(res => res.json());
  }
}

export {
  PSI_DEFAULT_CATEGORIES,
  PSIApi,
};
