/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// Just using `[]` actually asserts for an empty array.
// Use this expectation object to assert an array with at least one element.
const NONEMPTY_ARRAY = {
  length: '>0',
};

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for sites with various errors.
 */
const expectations = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/infinite-loop.html',
      finalUrl: 'http://localhost:10200/infinite-loop.html',
      runtimeError: {code: 'PAGE_HUNG'},
      runWarnings: ['Lighthouse was unable to reliably load the URL you requested because the page stopped responding.'],
      audits: {
        'first-contentful-paint': {
          scoreDisplayMode: 'error',
          errorMessage: 'Required traces gatherer did not run.',
        },
      },
    },
    artifacts: {
      PageLoadError: {code: 'PAGE_HUNG'},
      devtoolsLogs: {
        'pageLoadError-defaultPass': NONEMPTY_ARRAY,
      },
      traces: {
        'pageLoadError-defaultPass': {traceEvents: NONEMPTY_ARRAY},
      },
    },
  },
  {
    lhr: {
      requestedUrl: 'https://expired.badssl.com',
      finalUrl: 'https://expired.badssl.com/',
      runtimeError: {code: 'INSECURE_DOCUMENT_REQUEST'},
      runWarnings: ['The URL you have provided does not have a valid security certificate. net::ERR_CERT_DATE_INVALID'],
      audits: {
        'first-contentful-paint': {
          scoreDisplayMode: 'error',
          errorMessage: 'Required traces gatherer did not run.',
        },
      },
    },
    artifacts: {
      PageLoadError: {code: 'INSECURE_DOCUMENT_REQUEST'},
      devtoolsLogs: {
        'pageLoadError-defaultPass': NONEMPTY_ARRAY,
      },
      traces: {
        'pageLoadError-defaultPass': {traceEvents: NONEMPTY_ARRAY},
      },
    },
  },
  {
    lhr: {
      // Our interstitial error handling used to be quite aggressive, so we'll test a page
      // that has a bad iframe to make sure LH audits successfully.
      // https://github.com/GoogleChrome/lighthouse/issues/9562
      requestedUrl: 'http://localhost:10200/badssl-iframe.html',
      finalUrl: 'http://localhost:10200/badssl-iframe.html',
      audits: {
        'first-contentful-paint': {
          scoreDisplayMode: 'numeric',
        },
      },
    },
    artifacts: {
      devtoolsLogs: {
        defaultPass: NONEMPTY_ARRAY,
      },
      traces: {
        defaultPass: {traceEvents: NONEMPTY_ARRAY},
      },
    },
  },
];

module.exports = expectations;
