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
    requestedUrl: 'http://localhost:10200/agentic/llms_tester.html',
    finalDisplayedUrl: 'http://localhost:10200/agentic/llms_tester.html',
    audits: {
      'llms-txt': {
        score: 1,
        scoreDisplayMode: 'binary',
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
