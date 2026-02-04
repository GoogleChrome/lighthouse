/**
 * @license
 * Copyright 2019 Google LLC
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
    // This test used to hit the outside network of a live site, but now uses local fixtures.
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
    requestedUrl: 'http://localhost:10200/oopif-requests.html',
    finalDisplayedUrl: 'http://localhost:10200/oopif-requests.html',
    audits: {
      'network-requests': {
        // Multiple session attach handling fixed in M105
        // https://chromiumdash.appspot.com/commit/f42337f1d623ec913397610ccf01b5526e9e919d
        _minChromiumVersion: '105',
        details: {
          items: {
            // We want to make sure we are finding the iframe's requests (localhost:10503) *AND*
            // the iframe's iframe's requests (localhost:10420).
            _includes: [
              {url: 'http://localhost:10200/oopif-requests.html', finished: true, statusCode: 200, resourceType: 'Document', experimentalFromMainFrame: true},

              // Local iframe 1 (OOPIF) and subresource
              {url: 'http://localhost:10503/oopif-requests-iframe.html', finished: true, statusCode: 200, resourceType: 'Document', experimentalFromMainFrame: undefined},
              {url: 'http://localhost:10503/simple-script.js', finished: true, statusCode: 200, resourceType: 'Script', experimentalFromMainFrame: undefined},
              {url: 'http://localhost:10503/dobetterweb/lighthouse-480x318.jpg', finished: true, statusCode: 200, resourceType: 'Image', experimentalFromMainFrame: undefined},

              // Local iframe 2 (Sibling OOPIF)
              {url: 'http://localhost:10420/oopif-simple-page.html', finished: true, statusCode: 200, resourceType: 'Document'},

              // Nested iframe inside iframe 1 (Nested OOPIF)
              {url: 'http://localhost:10420/oopif-simple-page.html', finished: true, statusCode: 200, resourceType: 'Document'},
              {url: 'http://localhost:10420/simple-script.js', finished: true, statusCode: 200, resourceType: 'Script'},
            ],
          },
        },
      },
    },
  },
  artifacts: {
    IFrameElements: [
      {
        id: 'oopif-nested-root',
        src: 'http://localhost:10503/oopif-requests-iframe.html',
        clientRect: {
          width: '>0',
          height: '>0',
        },
        isPositionFixed: false,
      },
      {
        id: 'oopif-simple',
        src: 'http://localhost:10420/oopif-simple-page.html',
        clientRect: {
          width: '>0',
          height: '>0',
        },
        isPositionFixed: false,
      },
    ],
    Scripts: [],
  },
};

export default {
  id: 'oopif-requests',
  expectations,
  config,
};
