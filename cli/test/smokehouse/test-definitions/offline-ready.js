/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: [
      'best-practices',
    ],
    onlyAudits: [
      'is-on-https',
      'viewport',
      'user-timings',
      'critical-request-chains',
      'render-blocking-resources',
      'themed-omnibox',
      'aria-valid-attr',
      'aria-allowed-attr',
      'color-contrast',
      'image-alt',
      'label',
      'tabindex',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results from testing the a local test page that works
 * offline with a service worker.
 */
const expectations = {
  artifacts: {
    WebAppManifest: {
      value: {
        icons: {
          value: [
            {value: {src: {value: 'http://localhost:10503/launcher-icon-0-75x.png'}}},
            {value: {src: {value: 'http://localhost:10503/launcher-icon-1x.png'}}},
            {value: {src: {value: 'http://localhost:10503/launcher-icon-1-5x.png'}}},
            {value: {src: {value: 'http://localhost:10503/launcher-icon-2x.png'}}},
            {value: {src: {value: 'http://localhost:10503/launcher-icon-3x.png'}}},
          ],
        },
      },
    },
    InstallabilityErrors: {
      errors: [
        // Icon errors were consolidated in M118
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1476999
        {
          _minChromiumVersion: '118',
          errorId: 'no-acceptable-icon',
        },
        {
          _maxChromiumVersion: '117',
          errorId: 'no-icon-available',
        },
      ],
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10503/offline-ready.html',
    finalDisplayedUrl: 'http://localhost:10503/offline-ready.html',
    audits: {
      'is-on-https': {
        score: 1,
      },
      'viewport': {
        score: 1,
      },
      'user-timings': {
        scoreDisplayMode: 'notApplicable',
      },
      'critical-request-chains': {
        scoreDisplayMode: 'notApplicable',
      },
      'themed-omnibox': {
        score: 0,
      },
      'aria-valid-attr': {
        scoreDisplayMode: 'notApplicable',
      },
      'aria-allowed-attr': {
        scoreDisplayMode: 'notApplicable',
      },
      'color-contrast': {
        score: 1,
      },
      'image-alt': {
        score: 0,
      },
      'label': {
        scoreDisplayMode: 'notApplicable',
      },
      'tabindex': {
        scoreDisplayMode: 'notApplicable',
      },
    },
  },
};

export default {
  id: 'offline-ready',
  expectations,
  config,
  runSerially: true,
};
