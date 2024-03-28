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
 * Expected Lighthouse results from testing a page that does not work offline.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/online-only.html',
    finalDisplayedUrl: 'http://localhost:10200/online-only.html',
    audits: {
      'is-on-https': {
        score: 1,
      },
      'geolocation-on-start': {
        score: 1,
      },
      'render-blocking-resources': {
        score: 1,
      },
      'paste-preventing-inputs': {
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
        scoreDisplayMode: 'notApplicable',
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
  id: 'offline-online-only',
  expectations,
  config,
  runSerially: true,
};
