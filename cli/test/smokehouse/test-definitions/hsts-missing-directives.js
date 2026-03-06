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
    requestedUrl: 'https://hsts.badssl.com/',
    finalDisplayedUrl: 'https://hsts.badssl.com/',
    audits: {
      'has-hsts': {
        score: 1,
        details: {
          items: [
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
