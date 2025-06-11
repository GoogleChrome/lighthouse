/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    precomputedLanternData: {
      additionalRttByOrigin: {
        'http://localhost:10200': 500,
      },
      serverResponseTimeByOrigin: {
        'http://localhost:10200': 1000,
      },
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/tricky-main-thread.html?xhr',
    finalDisplayedUrl: 'http://localhost:10200/tricky-main-thread.html?xhr',
    audits: {
      'interactive': {
        // Make sure all of the CPU time is reflected in the perf metrics as well.
        // The scripts stalls for 3 seconds and lantern has a 4x multiplier so 12s minimum.
        numericValue: '>12000',
      },
      'bootup-time': {
        details: {
          items: {
            0: {
              url: /main-thread-consumer/,
              scripting: '>9000',
            },
          },
        },
      },
    },
  },
};

export default {
  id: 'lantern-xhr',
  expectations,
  config,
};

