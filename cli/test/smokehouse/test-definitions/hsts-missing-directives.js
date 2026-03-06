/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results a site with HSTS header issues.
 */
const expectations = {
  lhr: {
    requestedUrl: 'https://eslint.org/',
    finalDisplayedUrl: 'https://eslint.org/',
    audits: {
      'has-hsts': {
        score: 1,
        details: {
          items: [
            {
              directive: 'includeSubDomains',
              description: 'No `includeSubDomains` directive found',
              severity: 'Medium',
            },
            {
              directive: 'preload',
              description: 'No `preload` directive found',
              severity: 'Medium',
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'hsts-missing-directives',
  expectations,
};
