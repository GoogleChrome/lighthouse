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
    requestedUrl: 'http://localhost:10200/ric-shim.html?short',
    finalDisplayedUrl: 'http://localhost:10200/ric-shim.html?short',
    audits: {
      'total-blocking-time': {
        // With the requestIdleCallback shim in place 1ms tasks should not block at all and should max add up to
        // 12.5 ms each, which would result in 50ms under a 4x simulated throttling multiplier and therefore in 0 tbt
        numericValue: '<=100',
      },
    },
  },
};

export default {
  id: 'lantern-idle-callback-short',
  expectations,
  config,
};
