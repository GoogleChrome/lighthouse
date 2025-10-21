/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  audits: [
    // Test the `ignoredPatterns` audit option.
    {path: 'errors-in-console', options: {ignoredPatterns: ['An ignored error']}},
  ],
};

const imgA = {
  top: '650±50',
  bottom: '650±50',
  left: '10±10',
  right: '120±20',
  width: '120±20',
  height: '20±20',
};

const imgB = {
  top: '575±50',
  bottom: '650±50',
  left: '130±10',
  right: '250±20',
  width: '120±20',
  height: '80±20',
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for Do Better Web tests.
 */
const expectations = {
  artifacts: {
    BenchmarkIndex: '<10000',
    HostFormFactor: 'desktop',
    Stacks: [{
      id: 'jquery',
    }, {
      id: 'jquery-fast',
      name: 'jQuery (Fast path)',
    }, {
      id: 'wordpress',
    }],
    MainDocumentContent: /^<!doctype html>.*DoBetterWeb Mega Tester.*aggressive-promise-polyfill.*<\/html>[\r\n]*$/s,
    LinkElements: [
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=100',
        hrefRaw: './dbw_tester.css?delay=100',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
        hrefRaw: './unknown404.css?delay=200',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2200',
        hrefRaw: './dbw_tester.css?delay=2200',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_disabled.css?delay=200&isdisabled',
        hrefRaw: './dbw_disabled.css?delay=200&isdisabled',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
        hrefRaw: './dbw_tester.css?delay=3000&capped',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2000&async=true',
        hrefRaw: './dbw_tester.css?delay=2000&async=true',
        hreflang: '',
        as: 'style',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&async=true',
        hrefRaw: './dbw_tester.css?delay=3000&async=true',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'alternate stylesheet',
        href: 'http://localhost:10200/dobetterweb/empty.css',
        hrefRaw: './empty.css',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_tester.html',
        hrefRaw: '',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
      {
        rel: 'stylesheet',
        href: 'http://localhost:10200/dobetterweb/dbw_tester.css?scriptActivated&delay=200',
        hrefRaw: './dbw_tester.css?scriptActivated&delay=200',
        hreflang: '',
        as: '',
        crossOrigin: null,
        source: 'head',
      },
    ],
    MetaElements: [
      {
        name: '',
        content: '',
        charset: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, minimum-scale=1',
      },
      {
        name: '',
        content: 'Open Graph smoke test description',
        property: 'og:description',
      },
    ],
    DevtoolsLog: {
      _includes: [
        // Ensure we are getting async call stacks.
        {
          method: 'Network.requestWillBeSent',
          params: {
            type: 'Image',
            request: {
              url: 'http://localhost:10200/dobetterweb/lighthouse-480x318.jpg?async',
            },
            initiator: {
              type: 'script',
              stack: {
                callFrames: [],
                parent: {
                  description: 'Image',
                  callFrames: [
                    {
                      'functionName': '',
                      'url': 'http://localhost:10200/dobetterweb/dbw_tester.html',
                    },
                  ],
                  parent: {
                    description: 'Promise.then',
                    callFrames: [
                      {
                        'functionName': '',
                        'url': 'http://localhost:10200/dobetterweb/dbw_tester.html',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ],
    },
    ImageElements: {
      _includes: [{
        src: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?iar2',
        srcset: '',
        displayedWidth: 120,
        displayedHeight: 80,
        attributeWidth: '120',
        attributeHeight: '80',
        naturalDimensions: {
          width: 1024,
          height: 678,
        },
        isCss: false,
        isPicture: false,
        isInShadowDOM: false,
        loading: 'lazy',
        fetchPriority: 'low',
      }],
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    finalDisplayedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    audits: {
      'errors-in-console': {
        score: 0,
        details: {
          items: [
            {
              source: 'exception',
              description: /^Error: A distinctive error\s+at http:\/\/localhost:10200\/dobetterweb\/dbw_tester.html:\d+:\d+$/,
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/dbw_tester.html'},
            },
            {
              source: 'console.error',
              description: 'Error! Error!',
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/dbw_tester.html'},
            },
            {
              source: 'network',
              description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200'},
            },
            {
              source: 'network',
              description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/fcp-delayer.js?delay=5000'},
            },
            {
              // In the DT runner, the initial page load before staring Lighthouse will prevent this error.
              _excludeRunner: 'devtools',
              source: 'network',
              description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
              sourceLocation: {url: 'http://localhost:10200/favicon.ico'},
            },
          ],
        },
      },
      'geolocation-on-start': {
        score: 0,
      },
      'notification-on-start': {
        score: 0,
      },
      'render-blocking-insight': {
        score: '<1',
        metricSavings: {
          FCP: '>=50',
        },
        details: {
          items: [
            {
              url: 'http://localhost:10200/dobetterweb/fcp-delayer.js?delay=5000',
            },
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
            },
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2200',
            },
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.js',
            },
            {
              url: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
            },
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=100',
            },
          ],
        },
      },
      'deprecations': {
        // see https://github.com/GoogleChrome/lighthouse/issues/13895
        score: 0,
        details: {
          items: [
            {
              // For some reason CDT .json locale files strip out backticks. LH doesn't.
              value: /Synchronous `?XMLHttpRequest`? on the main thread is deprecated/,
              source: {
                type: 'source-location',
                url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
                urlProvider: 'network',
                line: '>0',
                column: 6,
              },
              subItems: undefined,
            },
            {
              value: /Unload event listeners are deprecated and will be removed/,
              source: {
                type: 'source-location',
                url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
                urlProvider: 'network',
                line: '>0',
                column: 9,
              },
            },
          ],
        },
      },
      'paste-preventing-inputs': {
        score: 0,
        details: {
          items: {
            length: 2,
          },
        },
      },
      'image-aspect-ratio': {
        score: 0,
        details: {
          items: {
            0: {
              displayedAspectRatio: /^120 x 15/,
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?iar1',
            },
            length: 2,
          },
        },
      },
      'image-size-responsive': {
        score: 0,
        details: {
          items: {
            0: {
              url: 'http://localhost:10200/dobetterweb/lighthouse-480x318.jpg?isr1',
            },
            length: 1,
          },
        },
      },
      'image-delivery-insight': {
        score: '<0.5',
        metricSavings: {LCP: '>2000'},
        details: {
          debugData: {wastedBytes: '>1100000'},
          items: [
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-rotating.gif',
              totalBytes: 934285,
              wastedBytes: '682028 +/- 1000',
              subItems: {items: [{reason: /Using video formats instead of GIFs/}]},
            },
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?iar1', // filename is a lie...
              totalBytes: 112710,
              wastedBytes: '111815 +/- 1000',
              subItems: {items: [{reason: /This image file is larger than it needs to be \(1024x678\) for its displayed dimensions/}]},
            },
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?isr2',
              totalBytes: 112710,
              wastedBytes: '107937 +/- 1000',
              subItems: {items: [{reason: /This image file is larger than it needs to be \(1024x678\) for its displayed dimensions/}]},
            },
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?iar2',
              totalBytes: 112710,
              wastedBytes: '107937 +/- 1000',
              subItems: {items: [{reason: /This image file is larger than it needs to be \(1024x678\) for its displayed dimensions/}]},
            },
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?isr3',
              totalBytes: 112710,
              wastedBytes: '69754 +/- 1000',
              subItems: {items: [{reason: /This image file is larger than it needs to be \(1024x678\) for its displayed dimensions/}]},
            },
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg',
              totalBytes: 112710,
              wastedBytes: '69754 +/- 1000',
              subItems: {items: [{reason: /This image file is larger than it needs to be \(1024x678\) for its displayed dimensions/}]},
            },
          ],
        },
      },
      'js-libraries': {
        scoreDisplayMode: 'informative',
        details: {
          items: [{
            name: 'jQuery',
          },
          {
            name: 'WordPress',
          }],
        },
      },
      'dom-size-insight': {
        score: 1,
        numericValue: 153,
        details: {
          items: [
            {
              statistic: 'Total elements',
              value: {
                type: 'numeric',
                granularity: 1,
                value: 153,
              },
            },
            {
              statistic: 'DOM depth',
              value: {
                type: 'numeric',
                granularity: 1,
                value: 4,
              },
            },
            {
              statistic: 'Most children',
              value: {
                type: 'numeric',
                granularity: 1,
                value: 100,
              },
              node: {snippet: '<div id="shadow-root-container">'},
            },
          ],
        },
      },
      'bf-cache': {
        details: {
          items: [
            {
              reason: 'The page has an unload handler in the main frame.',
              failureType: 'Actionable',
              subItems: {
                items: [{
                  frameUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
                }],
              },
            },
            {
              // This issue only appears in the DevTools runner for some reason.
              // TODO: Investigate why this doesn't happen on the CLI runner.
              _runner: 'devtools',
              reason: 'There were permission requests upon navigating away.',
              failureType: 'Pending browser support',
              subItems: {
                items: [{
                  frameUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
                }],
              },
            },
          ],
        },
      },
      'network-rtt': {
        details: {
          items: {
            _includes: [
              {origin: 'http://localhost:10200', rtt: '>0'},
              {origin: 'http://[::1]:10503', rtt: '>0'},
            ],
            _excludes: [{}],
          },
        },
      },
      'network-server-latency': {
        details: {
          items: {
            _includes: [
              {origin: 'http://localhost:10200', serverResponseTime: '>0'},
              // The response time estimate is based on just 1 request which can force Lighthouse
              // to report a response time of 0 sometimes.
              // https://github.com/GoogleChrome/lighthouse/pull/15729#issuecomment-1877869991
              {origin: 'http://[::1]:10503', serverResponseTime: '>=0'},
            ],
            _excludes: [{}],
          },
        },
      },
      'metrics': {
        // Flaky in DevTools
        _excludeRunner: 'devtools',
        details: {items: {0: {
          timeToFirstByte: '450+/-100',
          lcpLoadDelay: '>5000',
          lcpLoadDuration: '>5000',
        }}},
      },
      'third-party-cookies': {
        score: 0,
        displayValue: '1 cookie found',
        details: {
          items: [
            {name: 'Foo', url: /^http:\/\/\[::1\]:10503\/dobetterweb\/empty_module\.js/},
          ],
        },
      },
      'viewport-insight': {
        score: 1,
        details: {
          items: [
            {
              node: {snippet: '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">'},
            },
          ],
        },
      },
    },
    fullPageScreenshot: {
      screenshot: {
        width: 412,
        // Allow for differences in platforms.
        height: '1350±100',
        data: /^data:image\/webp;.{500,}/,
      },
      nodes: {
        _includes: [
          // Test that the numbers for individual elements are in the ballpark.
          [/[0-9]-[0-9]+-IMG/, imgA],
          [/[0-9]-[0-9]+-IMG/, imgB],
          // And then many more nodes...
        ],
        _excludes: [
          // Ensure that the nodes we found above are unique.
          [/[0-9]-[0-9]+-IMG/, imgA],
          [/[0-9]-[0-9]+-IMG/, imgB],
        ],
      },
    },
  },
};

export default {
  id: 'dbw',
  expectations,
  config,
  runSerially: true, // Need access to network request assertions.
};
