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
    requestedUrl: 'http://localhost:10200/online-only.html',
    finalDisplayedUrl: 'http://localhost:10200/online-only.html',
    audits: {
      'first-contentful-paint': {
        numericValue: '>2000',
      },
      'interactive': {
        numericValue: '>2000',
      },
    },
  },
};

export default {
  id: 'lantern-online',
  expectations,
  config,
};
