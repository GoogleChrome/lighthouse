/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {LH.Config}
 */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'llms-txt',
    ],
  },
};


/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10503/agentic/llms_tester.html',
    finalDisplayedUrl: 'http://localhost:10503/agentic/llms_tester.html',
    audits: {
      'llms-txt': {
        score: 0,
        scoreDisplayMode: 'binary',
        details: {
          type: 'table',
          items: [
            {message: 'File is missing a required H1 header (e.g., "# Title").'},
            {message: 'File does not appear to contain any links.'},
            {message: 'File is suspiciously short.'},
          ],
        },
      },
    },
  },
};

/** @type {Smokehouse.TestDfn} */
export default {
  id: 'llms-txt',
  config,
  expectations: expectations,
};
