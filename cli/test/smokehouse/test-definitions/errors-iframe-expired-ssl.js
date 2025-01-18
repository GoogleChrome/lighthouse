/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Config file for sites with various errors, just fail out quickly.
 * @type {LH.Config}
 */
const config = {
  extends: 'lighthouse:default',
  settings: {
    maxWaitForLoad: 5000,
    onlyAudits: [
      'first-contentful-paint',
    ],
  },
};

// Just using `[]` actually asserts for an empty array.
// Use this expectation object to assert an array with at least one element.
const NONEMPTY_ARRAY = {
  length: '>0',
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for a site with an iframe containing a site with
 * an expired certificate.
 */
const expectations = {
  lhr: {
    // Our interstitial error handling used to be quite aggressive, so we'll test a page
    // that has a bad iframe to make sure LH audits successfully.
    // https://github.com/GoogleChrome/lighthouse/issues/9562
    requestedUrl: 'http://localhost:10200/badssl-iframe.html',
    finalDisplayedUrl: 'http://localhost:10200/badssl-iframe.html',
    audits: {
      'first-contentful-paint': {
        scoreDisplayMode: 'numeric',
      },
    },
  },
  artifacts: {
    DevtoolsLog: NONEMPTY_ARRAY,
    Trace: {traceEvents: NONEMPTY_ARRAY},
  },
};

export default {
  id: 'errors-iframe-expired-ssl',
  expectations,
  config,
  runSerially: true,
};
