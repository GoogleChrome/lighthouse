/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: ['viewport'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    Timing: {
      _includes: [
        {
          name: 'lh:runner:gather',
        },
      ],
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/simple-page.html',
    finalDisplayedUrl: 'http://localhost:10200/simple-page.html',
    audits: {},
    timing: {
      entries: {
        _includes: [
          {
            name: 'lh:runner:gather',
          },
          {
            name: 'lh:runner:audit',
          },
        ],
      },
    },
  },
};

export default {
  id: 'timing',
  expectations,
  config,
};
