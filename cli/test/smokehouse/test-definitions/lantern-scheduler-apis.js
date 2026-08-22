/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult[]}
 */
const expectations = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/scheduler-apis.html?yield',
      finalDisplayedUrl: 'http://localhost:10200/scheduler-apis.html?yield',
      audits: {
        'total-blocking-time': {
          numericValue: '<=100',
        },
        'long-tasks': {
          details: {
            items: {
              length: 0,
            },
          },
        },
      },
    },
  },
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/scheduler-apis.html?postTask',
      finalDisplayedUrl: 'http://localhost:10200/scheduler-apis.html?postTask',
      audits: {
        'total-blocking-time': {
          numericValue: '<=100',
        },
        'long-tasks': {
          details: {
            items: {
              length: 0,
            },
          },
        },
      },
    },
  },
];

export default {
  id: 'lantern-scheduler-apis',
  expectations,
  config,
};
