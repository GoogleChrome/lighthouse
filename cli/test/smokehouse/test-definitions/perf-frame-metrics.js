/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools',
    // preload-fonts isn't a performance audit, but can easily leverage the font
    // webpages present here, hence the inclusion of 'best-practices'.
    onlyCategories: ['performance', 'best-practices'],

    // BF cache will request the page again, initiating additional network requests.
    // Disable the audit so we only detect requests from the normal page load.
    skipAudits: ['bf-cache'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for testing cross-frame-metrics.
 */
const expectations = {
  networkRequests: {
    // DevTools loads the page three times, so this request count will not be accurate.
    _excludeRunner: 'devtools',
    length: 2,
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/perf/frame-metrics.html',
    finalDisplayedUrl: 'http://localhost:10200/perf/frame-metrics.html',
    audits: {
      'metrics': {
        score: 1,
        details: {
          type: 'debugdata',
          items: [
            {
              firstContentfulPaint: '>5000',
              firstContentfulPaintAllFrames: '<5000',
              largestContentfulPaint: '>5000',
              largestContentfulPaintAllFrames: '<5000',
              cumulativeLayoutShift: '0.133 +/- 0.001',
              cumulativeLayoutShiftMainFrame: '0.001 +/- 0.0005',
            },
            {
              lcpInvalidated: false,
            },
          ],
        },
      },
      'largest-contentful-paint': {
        // Non-all-frames value.
        numericValue: '>5000',
      },
      'largest-contentful-paint-element': {
        details: {
          items: {0: {
            items: [{
              node: {
                // Element should be from main frame while metric is not LCPAllFrames.
                nodeLabel: 'This is the main frame LCP and FCP.',
              },
            }],
          }},
        },
      },
    },
  },
};

export default {
  id: 'perf-frame-metrics',
  expectations,
  config,
  runSerially: true,
};
