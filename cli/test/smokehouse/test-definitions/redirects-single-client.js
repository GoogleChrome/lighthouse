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
 * Expected Lighthouse audit values for a site with a client-side redirect (2s + 5s), no paint.
 */
const expectations = {
  // TODO: Assert performance metrics on client-side redirects, see https://github.com/GoogleChrome/lighthouse/pull/10325
  lhr: {
    requestedUrl: `http://localhost:10200/js-redirect.html?delay=2000&jsDelay=5000&jsRedirect=%2Fredirects-final.html#hash`,
    finalDisplayedUrl: 'http://localhost:10200/redirects-final.html',
    audits: {
      redirects: {
        numericValue: '>=6000',
        details: {
          items: [
            // Conservative wastedMs to avoid flakes.
            {url: /js-redirect\.html/, wastedMs: '>6000'},
            {url: /redirects-final\.html/, wastedMs: 0},
          ],
        },
      },
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*js-redirect.html.*\) was redirected to .*redirects-final.html. Try testing the second URL directly./,
    ],
  },
  artifacts: {
    URL: {
      requestedUrl: `http://localhost:10200/js-redirect.html?delay=2000&jsDelay=5000&jsRedirect=%2Fredirects-final.html#hash`,
      mainDocumentUrl: 'http://localhost:10200/redirects-final.html',
      finalDisplayedUrl: 'http://localhost:10200/redirects-final.html',
    },
  },
};

export default {
  id: 'redirects-single-client',
  expectations,
  config,
};
