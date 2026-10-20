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
                featureId: {text: 'accent-color'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'limited',
                  displayString: 'Limited Availability',
                },
              },
              {
                featureId: {text: 'accelerometer'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'limited',
                  displayString: 'Limited Availability',
                },
              },
              {
                featureId: {text: 'popover'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'low',
                  displayString: /^Newly Available/,
                },
              },
              {
                featureId: {text: 'has'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'high',
                  displayString: /^Widely Available/,
                },
              },
              {
                featureId: {text: 'forced-colors'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'high',
                  displayString: /^Widely Available/,
                },
              },
              {
                featureId: {text: 'dialog'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'high',
                  displayString: /^Widely Available/,
                },
              },
              {
                featureId: {text: 'aborting'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'high',
                  displayString: /^Widely Available/,
                },
              },
              {
                featureId: {text: 'grid'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'high',
                  displayString: /^Widely Available/,
                },
              },
              {
                featureId: {text: 'flexbox'},
                displayStatus: {
                  type: 'baseline-status',
                  status: 'high',
                  displayString: /^Widely Available/,
                },
              },
            ],
            _excludes: [{}],
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

