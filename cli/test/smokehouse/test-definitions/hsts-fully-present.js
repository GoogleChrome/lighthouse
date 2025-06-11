/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results a site with full HSTS deployed.
 */
const expectations = {
  lhr: {
    requestedUrl: 'https://hstspreload.org/',
    finalDisplayedUrl: 'https://hstspreload.org/',
    audits: {
      'has-hsts': {
        score: null,
      },
    },
  },
};

export default {
  id: 'hsts-fully-present',
  expectations,
};
