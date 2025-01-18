/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    URL: {
      requestedUrl: 'http://jakearchibald.github.io/svgomg/',
      mainDocumentUrl: 'https://jakearchibald.github.io/svgomg/',
      finalDisplayedUrl: 'https://jakearchibald.github.io/svgomg/',
    },
  },
  lhr: {
    // Intentionally start out on http to test the redirect.
    requestedUrl: 'http://jakearchibald.github.io/svgomg/',
    finalDisplayedUrl: 'https://jakearchibald.github.io/svgomg/',
    runWarnings: [
      'The page may not be loading as expected because your test URL (http://jakearchibald.github.io/svgomg/) was redirected to https://jakearchibald.github.io/svgomg/. Try testing the second URL directly.',
    ],
    audits: {
      'redirects-http': {
        score: 1,
      },
    },
  },
};

export default {
  id: 'redirects-http',
  expectations,
};


