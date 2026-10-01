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
              issue: /ArdManifest validation failed: .* at path 'entries.0.identifier'/,
              severity: 'Error',
            },
            {
              element: 'Invalid Service',
              issue: /ArdEntry validation failed: .* at path 'identifier'/,
              severity: 'Error',
            },
            {
              element: 'Invalid Service',
              issue: /Identifier 'invalid-urn-format' does not match RFC 8141 URN pattern/,
              severity: 'Error',
            },
            {
              element: 'Invalid Service',
              issue: /No 'representativeQueries'/,
              severity: 'Low',
            },
            {
              element: 'http://localhost:10200/agentic/missing-ard.json',
              issue: /Advertised ARD manifest location could not be loaded \(HTTP status 404\)/,
              severity: 'Low',
            },
            {
              element: 'http://localhost:10200/agentic/ai-catalog-invalid.json',
              issue: /Manifest was only found through a predecessor name/,
              severity: 'Low',
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
