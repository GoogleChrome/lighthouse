/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {[string, string][]} headers
 * @return {string}
 */
function headersParam(headers) {
  const headerString = new URLSearchParams(headers).toString();
  return new URLSearchParams([['extra_header', headerString]]).toString();
}

const clickjackingMitigationCsp = headersParam([[
  'Content-Security-Policy',
  'frame-ancestors \'self\'',
]]);

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for a site with present Clickjacking mitigations
 * (through the X-Frame-Options or Content-Security-Policy headers).
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/simple-page.html?' + clickjackingMitigationCsp,
    finalDisplayedUrl: 'http://localhost:10200/simple-page.html?' + clickjackingMitigationCsp,
    audits: {
      'clickjacking-mitigation': {
        score: null,
      },
    },
  },
};

export default {
  id: 'clickjacking-mitigation-headers-present',
  expectations,
};
