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
    requestedUrl: 'http://localhost:10200/agentic/ard_tester.html',
    finalDisplayedUrl: 'http://localhost:10200/agentic/ard_tester.html',
    audits: {
      'ard-schema': {
        score: 1,
        scoreDisplayMode: 'binary',
      },
    },
  },
};

/** @type {Smokehouse.TestDfn} */
export default {
  id: 'ard',
  config,
  expectations,
};
