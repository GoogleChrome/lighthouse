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
    requestedUrl: 'http://localhost:10200/oopif-requests.html',
    finalDisplayedUrl: 'http://localhost:10200/oopif-requests.html',
    audits: {
      'network-requests': {
        // Multiple session attach handling fixed in M105
        // https://chromiumdash.appspot.com/commit/f42337f1d623ec913397610ccf01b5526e9e919d
        _minChromiumVersion: '105',
        details: {
          items: {
            // We want to make sure we are finding the iframe's requests (paulirish.com) *AND*
            // the iframe's iframe's iframe's requests (youtube.com/doubleclick/etc).
            _includes: [
              {url: 'http://localhost:10200/oopif-requests.html', finished: true, statusCode: 200, resourceType: 'Document', experimentalFromMainFrame: true},

              // Paulirish iframe and subresource
              {url: 'https://www.paulirish.com/2012/why-moving-elements-with-translate-is-better-than-posabs-topleft/', finished: true, statusCode: 200, resourceType: 'Document', experimentalFromMainFrame: undefined},
              {url: 'https://www.paulirish.com/avatar150.jpg', finished: true, statusCode: 200, resourceType: 'Image', experimentalFromMainFrame: undefined},
              {url: 'https://www.googletagmanager.com/gtag/js?id=G-PGXNGYWP8E', finished: true, statusCode: 200, resourceType: 'Script', experimentalFromMainFrame: undefined},
              {url: /^https:\/\/fonts\.googleapis\.com\/css/, finished: true, statusCode: 200, resourceType: 'Stylesheet', experimentalFromMainFrame: undefined},

              // Youtube iframe (OOPIF) and some subresources
              // FYI: Youtube has a ServiceWorker which sometimes cancels the document request. As a result, there will sometimes be multiple requests for this file.
              {url: 'https://www.youtube.com/embed/NZelrwd_iRs', finished: true, statusCode: 200, resourceType: 'Document'},
              {url: /^https:\/\/www\.youtube\.com\/.*?player.*?css/, finished: true, statusCode: 200, resourceType: 'Stylesheet'},
              {url: /^https:\/\/www\.youtube\.com\/.*?\/embed.js/, finished: true, statusCode: 200, resourceType: 'Script', experimentalFromMainFrame: undefined},

              // Disqus iframe (OOPIF)
              {url: /^https:\/\/disqus\.com\/embed\/comments\//, finished: true, statusCode: 200, resourceType: 'Document'},
              // Disqus subframe (that's a new OOPIF)
              {url: 'https://accounts.google.com/o/oauth2/iframe', finished: true, statusCode: 200, resourceType: 'Document'},
            ],
          },
        },
      },
    },
  },
  artifacts: {
    IFrameElements: [
      {
        id: 'oopif',
        src: 'https://www.paulirish.com/2012/why-moving-elements-with-translate-is-better-than-posabs-topleft/',
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
