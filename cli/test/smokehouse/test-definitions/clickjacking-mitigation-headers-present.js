/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for a site with present Clickjacking mitigations
 * (through the X-Frame-Options or Content-Security-Policy headers).
 */
const expectations = {
  lhr: {
    requestedUrl: 'https://developer.mozilla.org/en-US/',
    finalDisplayedUrl: 'https://developer.mozilla.org/en-US/',
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
