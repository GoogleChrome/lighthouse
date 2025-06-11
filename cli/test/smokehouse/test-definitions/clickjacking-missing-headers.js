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
    requestedUrl: 'https://example.com/',
    finalDisplayedUrl: 'https://example.com/',
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
