/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * Expected Lighthouse audit values for tricky metrics tests that previously failed to be computed.
 * We only place lower bounds because we are checking that these metrics *can* be computed and that
 * we wait long enough to compute them. Upper bounds aren't very helpful here and tend to cause flaky failures.
 */

/**
 * A config with no throttling used for tricky-metrics tests.
 * Those class of tricky metrics need to use observed metrics and DevTools throttling has too many bugs
 * to capture the nuances we're testing.
 * @type {LH.Config}
 */
const config = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'provided',
    onlyCategories: ['performance'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Lighthouse expecations that metrics are computed even if a debugger statement
 * is left in the page's JS.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/debugger.html',
    finalDisplayedUrl: 'http://localhost:10200/debugger.html',
    audits: {
      'first-contentful-paint': {
        numericValue: '>1', // We just want to check that it doesn't error
      },
    },
  },
};

export default {
  id: 'metrics-debugger',
  expectations,
  config,
};
