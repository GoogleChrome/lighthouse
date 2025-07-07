/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for a site with missing DOM-XSS mitigations
 * (through the lack of Trusted-Types direcives in the Content-Security-Policy
 * headers).
 */
const expectations = {
  lhr: {
    requestedUrl: 'https://example.com/',
    finalDisplayedUrl: 'https://example.com/',
    audits: {
      'trusted-types-xss': {
        score: 1,
        details: {
          items: [
            {
              description: 'No `Content-Security-Policy` header with Trusted Types directive found',
              severity: 'High',
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'trusted-types-missing-directives',
  expectations,
};
