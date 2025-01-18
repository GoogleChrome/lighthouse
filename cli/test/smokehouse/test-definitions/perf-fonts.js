/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools',
    // preload-fonts isn't a performance audit, but can easily leverage the font
    // webpages present here, hence the inclusion of 'best-practices'.
    onlyCategories: ['performance', 'best-practices'],

    // BF cache will request the page again, initiating additional network requests.
    // Disable the audit so we only detect requests from the normal page load.
    skipAudits: ['bf-cache'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for testing font perf.
 */
const expectations = {
  networkRequests: {
    // DevTools loads the page three times, so this request count will not be accurate.
    _excludeRunner: 'devtools',
    length: 5,
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/perf/fonts.html',
    finalDisplayedUrl: 'http://localhost:10200/perf/fonts.html',
    audits: {
      'font-display': {
        score: 0.5,
        details: {
          items: [
            {
              url: 'http://localhost:10200/perf/lobster-v20-latin-regular.woff2',
            },
          ],
        },
      },
      // Disabled for now, see https://github.com/GoogleChrome/lighthouse/issues/11960
      // 'preload-fonts': {
      //   scoreDisplayMode: 'notApplicable',
      //   score: 0,
      //   details: {
      //     items: [
      //       {
      //         url: 'http://localhost:10200/perf/lobster-two-v10-latin-700.woff2?delay=1000',
      //       },
      //     ],
      //   },
      // },
    },
  },
};

export default {
  id: 'perf-fonts',
  expectations,
  config,
  runSerially: true,
};
