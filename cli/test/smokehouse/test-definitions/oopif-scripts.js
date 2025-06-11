/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  categories: {
    performance: {
      title: 'Performance',
      auditRefs: [
        {id: 'oopif-iframe-test-audit', weight: 0},
      ],
    },
  },
  audits: [
    // Include an audit that *forces* the IFrameElements artifact to be used for our test.
    {path: 'oopif-iframe-test-audit'},
  ],
  settings: {
    // This test runs in CI and hits the outside network of a live site.
    // Be a little more forgiving on how long it takes all network requests of several nested iframes
    // to complete.
    maxWaitForLoad: 180000,
    // CI machines are pretty weak which lead to many more long tasks than normal.
    // Reduce our requirement for CPU quiet.
    cpuQuietThresholdMs: 500,
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for sites with OOPIFS.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/oopif-scripts.html',
    finalDisplayedUrl: 'http://localhost:10200/oopif-scripts.html',
    audits: {
      'network-requests': {
        details: {
          items: {
            _includes: [
              {url: 'http://localhost:10200/oopif-scripts.html', sessionTargetType: 'page'},
              {url: 'http://localhost:10200/oopif-simple-page.html', sessionTargetType: 'page'},
              {url: 'http://localhost:10503/oopif-simple-page.html', sessionTargetType: 'iframe'},

              // From in-process iframe
              {url: 'http://localhost:10200/simple-script.js', resourceType: 'Script', sessionTargetType: 'page'},
              {url: 'http://localhost:10200/simple-script.js', resourceType: 'Fetch', sessionTargetType: 'page'},
              // The target type of worker requests can vary depending on the Chrome version and if
              // the field trial config is being used.
              {url: 'http://localhost:10200/simple-worker.js', sessionTargetType: /(page|worker)/},
              {url: 'http://localhost:10200/simple-worker.mjs', sessionTargetType: /(page|worker)/},
              // From in-process iframe -> simple-worker.js
              {url: 'http://localhost:10200/simple-script.js?importScripts', resourceType: 'Other', sessionTargetType: 'worker'},
              // From in-process iframe -> simple-worker.mjs
              {url: 'http://localhost:10200/simple-script.js?esm', resourceType: 'Script', sessionTargetType: 'worker'},

              // From OOPIF
              {url: 'http://localhost:10503/simple-script.js', resourceType: 'Script', sessionTargetType: 'iframe'},
              {url: 'http://localhost:10503/simple-script.js', resourceType: 'Fetch', sessionTargetType: 'iframe'},
              // The target type of worker requests can vary depending on the Chrome version and if
              // the field trial config is being used.
              {url: 'http://localhost:10503/simple-worker.js', sessionTargetType: /(iframe|worker)/},
              {url: 'http://localhost:10503/simple-worker.mjs', sessionTargetType: /(iframe|worker)/},
              // From OOPIF -> simple-worker.js
              {url: 'http://localhost:10503/simple-script.js?importScripts', resourceType: 'Other', sessionTargetType: 'worker'},
              // From OOPIF -> simple-worker.mjs
              {url: 'http://localhost:10503/simple-script.js?esm', resourceType: 'Script', sessionTargetType: 'worker'},
            ],
            // Ensure the above is exhaustive (except for favicon, which won't be fetched in devtools/LR).
            _excludes: [
              {url: /^((?!favicon).)*$/s},
            ],
          },
        },
      },
    },
  },
  artifacts: {
    IFrameElements: [
      {
        id: 'iframe-1',
        src: 'http://localhost:10200/oopif-simple-page.html',
        clientRect: {
          width: '>0',
          height: '>0',
        },
        isPositionFixed: true,
      },
      {
        id: 'iframe-2',
        src: 'http://localhost:10503/oopif-simple-page.html',
        clientRect: {
          width: '>0',
          height: '>0',
        },
        isPositionFixed: true,
      },
    ],
    // Only `:10200/oopif-simple-page.html`'s inclusion of `simple-script.js` shows here,
    // as well as inline scripts of the iframe.
    // All other scripts are filtered out because of our "OOPIF" filter.
    Scripts: {
      _includes: [
        {
          url: 'http://localhost:10200/simple-script.js',
          content: /🪁/,
        },
        {
          url: 'http://localhost:10200/oopif-simple-page.html',
          content: /new Worker/,
        },
      ],
      _excludes: [{}],
    },
  },
};

export default {
  id: 'oopif-scripts',
  expectations,
  config,
};
