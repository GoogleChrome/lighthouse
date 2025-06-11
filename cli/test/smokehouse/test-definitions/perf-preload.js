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
 * Expected Lighthouse audit values for preload tests.
 */
const expectations = {
  artifacts: {
    LinkElements: {
      _includes: [{
        rel: 'preload',
        href: 'http://localhost:10200/perf/level-2.js?warning&delay=500',
        hrefRaw: '/perf/level-2.js?warning&delay=500',
        hreflang: '',
        as: 'script',
        crossOrigin: 'use-credentials',
        source: 'head',
        fetchPriority: 'high',
      }],
    },
  },
  networkRequests: {
    // DevTools loads the page three times, so this request count will not be accurate.
    _excludeRunner: 'devtools',
    // 8 requests made for normal page testing.
    // 1 extra request made because stylesheets are evicted from the cache by the time DT opens.
    length: 9,
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/preload.html',
    finalDisplayedUrl: 'http://localhost:10200/preload.html',
    audits: {
      'speed-index': {
        score: '>=0.80', // primarily just making sure it didn't fail/go crazy, specific value isn't that important
      },
      'interactive': {
        score: '>=0.90', // primarily just making sure it didn't fail/go crazy, specific value isn't that important
      },
      'server-response-time': {
        // Assert greater than 0 but not more than 1000.
        numericValue: '500 +/- 499.99',
      },
      'network-requests': {
        details: {
          items: {
            _includes: [
              {url: 'http://localhost:10200/preload.html', isLinkPreload: undefined, experimentalFromMainFrame: true},
              {url: 'http://localhost:10200/perf/level-2.js?warning&delay=500', isLinkPreload: true, experimentalFromMainFrame: true},
              {url: 'http://localhost:10200/perf/preload_tester.js', isLinkPreload: undefined, experimentalFromMainFrame: true},
            ],
            length: '>5',
          },
        },
      },
      // Disabled for now, see https://github.com/GoogleChrome/lighthouse/issues/11960
      // 'uses-rel-preload': {
      //   scoreDisplayMode: 'notApplicable',
      //   score: '<1',
      //   numericValue: '>500',
      //   warnings: {
      //     0: /level-2.*warning/,
      //     length: 1,
      //   },
      //   details: {
      //     items: {
      //       length: 1,
      //     },
      //   },
      // },
      'uses-rel-preconnect': {
        score: 1,
        warnings: [/localhost:10503/],
      },
    },
  },
};

export default {
  id: 'perf-preload',
  expectations,
  config,
  runSerially: true,
};
