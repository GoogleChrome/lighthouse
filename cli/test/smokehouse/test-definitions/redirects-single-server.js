/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'first-contentful-paint',
      'interactive',
      'speed-index',
      'redirects',
    ],
    // Use provided throttling method to test usage of correct navStart.
    throttlingMethod: /** @type {const} */ ('provided'),
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site with a single server-side redirect (2s).
 */
const expectations = {
  artifacts: {
    URL: {
      requestedUrl: 'http://localhost:10200/online-only.html?delay=2000&redirect=%2Fredirects-final.html#hash',
      mainDocumentUrl: 'http://localhost:10200/redirects-final.html',
      finalDisplayedUrl: 'http://localhost:10200/redirects-final.html#hash',
    },
  },
  lhr: {
    requestedUrl: `http://localhost:10200/online-only.html?delay=2000&redirect=%2Fredirects-final.html#hash`,
    finalDisplayedUrl: 'http://localhost:10200/redirects-final.html#hash',
    audits: {
      'first-contentful-paint': {
        numericValue: '>=2000',
      },
      'interactive': {
        numericValue: '>=2000',
      },
      'speed-index': {
        numericValue: '>=2000',
      },
      'redirects': {
        score: 0,
        numericValue: '>=2000',
        details: {
          items: [
            // Conservative wastedMs to avoid flakes.
            {url: /online-only\.html/, wastedMs: '>1000'},
            {url: /redirects-final\.html$/, wastedMs: 0},
          ],
        },
      },
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*online-only.html.*\) was redirected to .*redirects-final.html. Try testing the second URL directly./,
    ],
  },
};

export default {
  id: 'redirects-single-server',
  expectations,
  config,
};
