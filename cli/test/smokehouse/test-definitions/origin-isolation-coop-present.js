/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for a site with a configured COOP header.
 */
const expectations = {
  lhr: {
    requestedUrl: 'https://csp.withgoogle.com/docs/index.html',
    finalDisplayedUrl: 'https://csp.withgoogle.com/docs/index.html',
    audits: {
      'origin-isolation': {
        score: null,
      },
    },
  },
};

export default {
  id: 'origin-isolation-coop-present',
  expectations,
};
