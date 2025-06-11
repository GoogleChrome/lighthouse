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
 * Expected Lighthouse audit values for a site with a client-side redirect (2s + 5s),
 * paints at 2s, then a server-side redirect (1s), followed by a history.pushState to an unrelated URL.
 */
const expectations = {
  // TODO: Assert performance metrics on client-side redirects, see https://github.com/GoogleChrome/lighthouse/pull/10325
  lhr: {
    requestedUrl: `http://localhost:10200/js-redirect.html?delay=2000&jsDelay=5000&jsRedirect=%2Fonline-only.html%3Fdelay%3D1000%26redirect%3D%2Fredirects-final.html%253FpushState`,
    finalDisplayedUrl: 'http://localhost:10200/push-state',
    audits: {
      redirects: {
        score: '<1',
        numericValue: '>=8000',
        details: {
          items: [
            // Conservative wastedMs to avoid flakes.
            {url: /js-redirect\.html/, wastedMs: '>6000'},
            {url: /online-only\.html/, wastedMs: '>500'},
            {url: /redirects-final\.html\?pushState/, wastedMs: 0},
          ],
        },
      },
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*js-redirect.html.*\) was redirected to .*redirects-final.html\?pushState. Try testing the second URL directly./,
    ],
  },
  artifacts: {
    URL: {
      requestedUrl: `http://localhost:10200/js-redirect.html?delay=2000&jsDelay=5000&jsRedirect=%2Fonline-only.html%3Fdelay%3D1000%26redirect%3D%2Fredirects-final.html%253FpushState`,
      mainDocumentUrl: 'http://localhost:10200/redirects-final.html?pushState',
      finalDisplayedUrl: 'http://localhost:10200/push-state',
    },
  },
};

export default {
  id: 'redirects-history-push-state',
  expectations,
  config,
};
