/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for a site with present DOM-XSS mitigations
 * (through a Trusted-Types direcive in the Content-Security-Policy header).
 */
const expectations = {
  lhr: {
    requestedUrl: 'https://m.youtube.com/',
    finalDisplayedUrl: 'https://m.youtube.com/',
    audits: {
      'trusted-types-xss': {
        score: null,
      },
    },
  },
};

export default {
  id: 'trusted-types-directive-present',
  expectations,
};
