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
 * Expected Lighthouse audit values for a site with multiple server-side redirects (3 x 1s).
 */
const expectations = {
  lhr: {
    requestedUrl: `http://localhost:10200/online-only.html?delay=1000&redirect_count=3&redirect=%2Fredirects-final.html`,
    finalDisplayedUrl: 'http://localhost:10200/redirects-final.html',
    audits: {
      'first-contentful-paint': {
        numericValue: '>=3000',
      },
      'interactive': {
        numericValue: '>=3000',
      },
      'speed-index': {
        numericValue: '>=3000',
      },
      'redirects': {
        score: '<1',
        details: {
          items: [
            // Conservative wastedMs to avoid flakes.
            {url: /online-only\.html/, wastedMs: '>500'},
            {url: /online-only\.html/, wastedMs: '>500'},
            {url: /online-only\.html/, wastedMs: '>500'},
            {url: /redirects-final\.html/, wastedMs: 0},
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
  id: 'redirects-multiple-server',
  expectations,
  config,
};
