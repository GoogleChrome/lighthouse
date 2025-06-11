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
 * Expected Lighthouse results for a site with an expired certificate.
 */
const expectations = {
  lhr: {
    requestedUrl: 'https://expired.badssl.com',
    finalDisplayedUrl: /(expired.badssl.com|chrome-error)/,
    runtimeError: {code: 'INSECURE_DOCUMENT_REQUEST'},
    runWarnings: [
      /expired.badssl.*redirected to chrome-error:/,
      'The URL you have provided does not have a valid security certificate. net::ERR_CERT_DATE_INVALID',
    ],
    audits: {
      'first-contentful-paint': {
        scoreDisplayMode: 'error',
        errorMessage: 'The URL you have provided does not have a valid security certificate. net::ERR_CERT_DATE_INVALID',
      },
    },
  },
  artifacts: {
    PageLoadError: {code: 'INSECURE_DOCUMENT_REQUEST'},
    DevtoolsLogError: NONEMPTY_ARRAY,
    TraceError: {traceEvents: NONEMPTY_ARRAY},
  },
};

export default {
  id: 'errors-expired-ssl',
  expectations,
  config,
  runSerially: true,
};
