/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'ard-schema',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/agentic/ard_tester_invalid.html',
    finalDisplayedUrl: 'http://localhost:10200/agentic/ard_tester_invalid.html',
    audits: {
      'ard-schema': {
        score: 0,
        scoreDisplayMode: 'binary',
        details: {
          type: 'table',
          items: [
            {
              element: 'Root',
              issue: /JSON Schema Validation Failed/,
              severity: 'Error',
            },
            {
              element: 'Invalid Service',
              issue: /Identifier 'invalid-urn-format' does not match RFC 8141 URN pattern/,
              severity: 'Error',
            },
            {
              element: 'Invalid Service',
              issue: /Media type 'application\/json' is not one of standard discovery types/,
              severity: 'Warning',
            },
            {
              element: 'Invalid Service',
              issue: /Missing 'representativeQueries'/,
              severity: 'Warning',
            },
          ],
        },
      },
    },
  },
};

/** @type {Smokehouse.TestDfn} */
export default {
  id: 'ardInvalid',
  config,
  expectations,
};
