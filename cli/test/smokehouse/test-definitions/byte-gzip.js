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
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results testing gzipped requests.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/byte-efficiency/gzip.html',
    finalDisplayedUrl: 'http://localhost:10200/byte-efficiency/gzip.html',
    audits: {
      'network-requests': {
        details: {
          items: [
            {
              url: 'http://localhost:10200/byte-efficiency/gzip.html',
              finished: true,
            },
            {
              url: 'http://localhost:10200/byte-efficiency/script.js?gzip=1',
              transferSize: '913 +/- 150',
              resourceSize: '53000 +/- 1000',
              finished: true,
            },
            {
              url: 'http://localhost:10200/byte-efficiency/script.js',
              transferSize: '53200 +/- 1000',
              resourceSize: '53000 +/- 1000',
              finished: true,
            },
            {
              url: 'http://localhost:10200/favicon.ico',
              finished: true,
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'byte-gzip',
  expectations,
  config,
  runSerially: true,
};
