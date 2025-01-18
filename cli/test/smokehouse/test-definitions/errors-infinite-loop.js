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
 * Expected Lighthouse results for a site with a JS infinite loop.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/infinite-loop.html',
    finalDisplayedUrl: 'http://localhost:10200/infinite-loop.html',
    runtimeError: {code: 'PAGE_HUNG'},
    runWarnings: ['Lighthouse was unable to reliably load the URL you requested because the page stopped responding.'],
    audits: {
      'first-contentful-paint': {
        scoreDisplayMode: 'error',
        errorMessage: 'Lighthouse was unable to reliably load the URL you requested because the page stopped responding.',
      },
    },
  },
  artifacts: {
    PageLoadError: {code: 'PAGE_HUNG'},
    DevtoolsLogError: NONEMPTY_ARRAY,
    TraceError: {traceEvents: NONEMPTY_ARRAY},
  },
};

export default {
  id: 'errors-infinite-loop',
  expectations,
  config,
  runSerially: true,
};
