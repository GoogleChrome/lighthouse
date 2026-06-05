/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for a site with missing Clickjacking mitigations
 * (through the X-Frame-Options or Content-Security-Policy headers).
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/simple-page.html',
    finalDisplayedUrl: 'http://localhost:10200/simple-page.html',
    audits: {
      'clickjacking-mitigation': {
        score: 1,
        details: {
          items: [
            {
              description: 'No frame control policy found',
              severity: 'High',
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'clickjacking-missing-headers',
  expectations,
};
