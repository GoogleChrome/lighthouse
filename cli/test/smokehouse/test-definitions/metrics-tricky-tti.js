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
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/tricky-tti.html',
    finalDisplayedUrl: 'http://localhost:10200/tricky-tti.html',
    audits: {
      'interactive': {
        // stalls for ~5 seconds, ~5 seconds out, so should be at least ~10s
        numericValue: '>9900',
      },
    },
  },
};

export default {
  id: 'metrics-tricky-tti',
  expectations,
  config,
};
