/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {LH.Config}
 * Config file for running byte efficiency smokehouse audits.
 */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'accesskeys', // run axe on the page since we've had problems with interactions
      'network-requests',
      'offscreen-images',
      'uses-http2',
      'modern-image-formats',
      'uses-optimized-images',
      'uses-text-compression',
      'uses-responsive-images',
      'unminified-css',
      'unminified-javascript',
      'unused-css-rules',
      'unused-javascript',
      // image-size-responsive is not a byte-efficiency audit but a counterbalance to the byte-efficiency audits
      // that makes sense to test together.
      'image-size-responsive',
      // unsized-images is not a byte-efficiency audit but can easily leverage the variety of images present in
      // byte-efficiency tests & thus makes sense to test together.
      'unsized-images',
    ],
    throttlingMethod: 'devtools',
  },
  audits: [
    'unsized-images',
    {path: 'byte-efficiency/unused-javascript', options: {
      // Lower the threshold so we don't need huge resources to make a test.
      unusedThreshold: 2000,
    }},
  ],
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for byte efficiency audits.
 */
const expectations = {
  artifacts: {
    Scripts: {
      _includes: [
        {
          url: 'http://localhost:10200/byte-efficiency/tester.html',
          content: /generateInlineStyleWithSize/,
        },
        {
          url: 'http://localhost:10200/byte-efficiency/tester.html',
          content: /image-in-shadow-root/,
        },
        {
          url: 'http://localhost:10200/byte-efficiency/tester.html',
          content: /definitely-unused/,
        },
        {
          url: 'http://localhost:10200/byte-efficiency/tester.html',
          content: /Used block #1/,
        },
        {
          name: '/some-custom-url.js',
          url: 'http://localhost:10200/byte-efficiency/tester.html',
          content: /Unused block #1/,
        },
        {
          url: 'http://localhost:10200/byte-efficiency/script.js',
        },
        {
          url: 'http://localhost:10200/byte-efficiency/bundle.js',
        },
        // This _does not_ appear because it's a fake
        // resource (so the response is not served as JS content type).
        // {
        //   url: 'http://localhost:10200/byte-efficiency/delay-complete.js?delay=8000',
        // },
      ],
      // Ensure the above is exhaustive (except for favicon, which won't be fetched in devtools/LR).
      _excludes: [
        {url: /^((?!favicon).)*$/s},
      ],
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/byte-efficiency/tester.html',
    finalDisplayedUrl: 'http://localhost:10200/byte-efficiency/tester.html',
    audits: {
      'uses-http2': {
        score: 1,
        details: {
          // localhost gets a free pass on uses-h2
          items: [],
        },
      },
      'unminified-css': {
        details: {
          overallSavingsBytes: '>17000',
          items: {
            length: 2,
          },
        },
      },
      'unminified-javascript': {
        score: '<1',
        details: {
          // the specific ms value is not meaningful for this smoketest
          // *some largish amount* of savings should be reported
          overallSavingsMs: '>100',
          overallSavingsBytes: '>45000',
          items: [
            {
              url: 'http://localhost:10200/byte-efficiency/script.js',
              wastedBytes: '45816 +/- 100',
              wastedPercent: '87 +/- 5',
            },
            {
              // /some-custom-url.js,
              url: 'inline: \n  function unusedFunction() {\n    // U…',
              wastedBytes: '6630 +/- 100',
              wastedPercent: '99.6 +/- 0.1',
            },
            {
              url: 'inline: \n  // Used block #1\n  // FILLER DATA JU…',
              wastedBytes: '6510 +/- 100',
              wastedPercent: 100,
            },
            {
              url: 'http://localhost:10200/byte-efficiency/bundle.js',
              totalBytes: '12962 +/- 1000',
              wastedBytes: '2303 +/- 100',
              wastedPercent: '18 +/- 5',
            },
          ],
        },
      },
      'unused-css-rules': {
        details: {
          overallSavingsBytes: '>40000',
          items: {
            length: 2,
          },
        },
      },
      'unused-javascript': {
        score: '<1',
        metricSavings: {
          // the specific ms value here is not meaningful for this smoketest
          // *some* savings should be reported
          FCP: '>0',
        },
        details: {
          overallSavingsMs: '>=0',
          overallSavingsBytes: '35000 +/- 1000',
          items: [
            {
              url: 'http://localhost:10200/byte-efficiency/script.js',
              totalBytes: '53000 +/- 1000',
              wastedBytes: '22000 +/- 1000',
            },
            {
              // /some-custom-url.js,
              url: 'http://localhost:10200/byte-efficiency/tester.html',
              totalBytes: '6700 +/- 500',
              wastedBytes: '6600 +/- 500',
            },
            {
              url: 'http://localhost:10200/byte-efficiency/bundle.js',
              totalBytes: '12913 +/- 1000',
              wastedBytes: '5827 +/- 200',
              subItems: {
                items: [
                  {source: '…./b.js', sourceBytes: '4347 +/- 50', sourceWastedBytes: '2156 +/- 50'},
                  {source: '…./c.js', sourceBytes: '2200 +/- 50', sourceWastedBytes: '2182 +/- 50'},
                  {source: '…webpack/bootstrap', sourceBytes: '2809 +/- 50', sourceWastedBytes: '1259 +/- 50'},
                ],
              },
            },
          ],
        },
      },
      'offscreen-images': {
        details: {
          items: [
            {
              url: /lighthouse-unoptimized.jpg$/,
            }, {
              url: /lighthouse-480x320.webp$/,
            }, {
              url: /lighthouse-480x320.webp\?invisible$/,
            }, {
              url: /large.svg$/,
            },
          ],
        },
      },
      'modern-image-formats': {
        details: {
          overallSavingsBytes: '137000 +/- 10000',
          items: [
            {url: /lighthouse-1024x680.jpg$/},
            {url: /lighthouse-unoptimized.jpg$/},
            {url: /lighthouse-480x320.jpg$/},
            {url: /lighthouse-480x320.jpg\?attributesized/},
            {url: /lighthouse-480x320.jpg\?css/},
            {url: /lighthouse-480x320.jpg\?sprite/},
          ],
        },
      },
      'uses-text-compression': {
        score: '<1',
        details: {
          // the specific ms value is not meaningful for this smoketest
          // *some largish amount* of savings should be reported
          overallSavingsMs: '>100',
          overallSavingsBytes: '>50000',
          items: {
            length: 3,
          },
        },
      },
      'uses-optimized-images': {
        details: {
          overallSavingsBytes: '>10000',
          items: {
            length: 1,
          },
        },
      },
      // Check that images aren't TOO BIG.
      'uses-responsive-images': {
        details: {
          overallSavingsBytes: '169000 +/- 5000',
          items: [
            {wastedPercent: '81 +/- 5', url: /lighthouse-1024x680.jpg/},
            {wastedPercent: '88 +/- 5', url: /lighthouse-2048x1356.webp\?size0/},
            {wastedPercent: '65 +/- 5', url: /lighthouse-480x320.jpg/},
            {wastedPercent: '65 +/- 5', url: /lighthouse-480x320\.jpg\?attributesized/},
            {wastedPercent: '81 +/- 5', url: /lighthouse-480x320.webp/},
          ],
        },
      },
      // Checks that images aren't TOO SMALL.
      'image-size-responsive': {
        details: {
          items: [
            // One of these is the ?duplicate variant and another is the
            // ?cssauto variant but sort order isn't guaranteed
            // since the pixel diff is equivalent for identical images.
            {url: /lighthouse-320x212-poor.jpg/},
            {url: /lighthouse-320x212-poor.jpg/},
            {url: /lighthouse-320x212-poor.jpg/},
          ],
        },
      },
      'unsized-images': {
        details: {
          items: [
            {url: /lighthouse-320x212-poor\.jpg/},
            {url: /lighthouse-320x212-poor\.jpg\?cssauto/},
          ],
        },
      },
    },
  },
};

export default {
  id: 'byte-efficiency',
  expectations,
  config,
  runSerially: true,
};
