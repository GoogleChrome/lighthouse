/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
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

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'chrome://crash',
    finalDisplayedUrl: 'about:blank',
    runtimeError: {code: 'TARGET_CRASHED'},
    runWarnings: [
      'Browser tab has unexpectedly crashed.',
    ],
    audits: {
      'first-contentful-paint': {
        scoreDisplayMode: 'error',
        errorMessage: 'Browser tab has unexpectedly crashed.',
      },
    },
  },
};

export default {
  id: 'crash',
  expectations,
  config,
};
