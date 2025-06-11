/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const BASE_URL = 'http://localhost:10200/seo/';

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['seo'],
  },
};

/**
 * @param {[string, string][]} headers
 * @return {string}
 */
function headersParam(headers) {
  const headerString = new URLSearchParams(headers).toString();
  return new URLSearchParams([['extra_header', headerString]]).toString();
}

const passHeaders = headersParam([[
  'link',
  '<http://localhost:10200/seo/>; rel="canonical"',
]]);

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site that passes seo tests.
 */
const expectations = {
  lhr: {
    requestedUrl: BASE_URL + 'seo-tester.html?' + passHeaders,
    finalDisplayedUrl: BASE_URL + 'seo-tester.html?' + passHeaders,
    audits: {
      'document-title': {
        score: 1,
      },
      'meta-description': {
        score: 1,
      },
      'http-status-code': {
        score: 1,
      },
      'crawlable-anchors': {
        score: 0,
        details: {
          items: {
            length: 2,
          },
        },
      },
      'link-text': {
        score: 1,
      },
      'is-crawlable': {
        score: 1,
      },
      'hreflang': {
        score: 1,
      },
      'canonical': {
        score: 1,
      },
      'robots-txt': {
        score: 1,
      },
    },
  },
};

export default {
  id: 'seo-passing',
  expectations,
  config,
};
