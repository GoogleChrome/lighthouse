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
      'baseline',
    ],
  },
  categories: {
    // @ts-expect-error: `title` is required in CategoryJson but we rely on the default config to provide it.
    'best-practices': {
      auditRefs: [
        {id: 'baseline', weight: 0, group: 'best-practices-browser-compat'},
      ],
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for baseline compatibility.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/baseline.html',
    finalDisplayedUrl: 'http://localhost:10200/baseline.html',
    audits: {
      'baseline': {
        _minChromiumVersion: '148',
        score: '>=1',
        details: {
          items: {
            _includes: [
              {
                featureId: {text: 'grid'},
                displayStatus: /^Widely Available/,
              },
              {
                featureId: {text: 'flexbox'},
                displayStatus: /^Widely Available/,
              },
            ],
          },
        },
      },
    },
  },
};

export default {
  id: 'baseline',
  expectations,
  config,
};

