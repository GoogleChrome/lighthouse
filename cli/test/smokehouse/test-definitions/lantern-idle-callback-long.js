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
    requestedUrl: 'http://localhost:10200/ric-shim.html?long',
    finalDisplayedUrl: 'http://localhost:10200/ric-shim.html?long',
    audits: {
      'total-blocking-time': {
        // With a 4x throttling multiplier in place each 50ms task takes 200ms, which results in 150ms blocking time
        // each. We iterate ~40 times, so the true amount of blocking time we expect is ~6s, but
        // sometimes Chrome's requestIdleCallback won't fire the full 40 if the machine is under load,
        // so be generous with how much slack to give in the expectations.
        numericValue: '>2500',
      },
    },
  },
};

export default {
  id: 'lantern-idle-callback-long',
  expectations,
  config,
};
