/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
    TagsBlockingFirstPaint: [
      {
        tag: {
          tagName: 'LINK',
          url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=100',
        },
      },
      {
        tag: {
          tagName: 'LINK',
          url: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
        },
      },
      {
        tag: {
          tagName: 'LINK',
          url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2200',
        },

      },
      {
        tag: {
          tagName: 'LINK',
          url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
          mediaChanges: [
            {
              href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
              media: 'not-matching',
              matches: false,
            },
            {
              href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
              media: 'screen',
              matches: true,
            },
          ],
        },
      },
      {
        tag: {
          tagName: 'SCRIPT',
          url: 'http://localhost:10200/dobetterweb/dbw_tester.js',
        },
      },
      {
        tag: {
          tagName: 'SCRIPT',
          url: 'http://localhost:10200/dobetterweb/fcp-delayer.js?delay=5000',
        },
      },
    ],
    GlobalListeners: [{
      type: 'unload',
      scriptId: /^\d+$/,
      lineNumber: '>300',
      columnNumber: '>30',
    }],
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
          items: {
            0: {
              source: 'exception',
              description: /^Error: A distinctive error\s+at http:\/\/localhost:10200\/dobetterweb\/dbw_tester.html:\d+:\d+$/,
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/dbw_tester.html'},
            },
            1: {
              source: 'console.error',
              description: 'Error! Error!',
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/dbw_tester.html'},
            },
            2: {
              source: 'network',
              description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200'},
            },
            3: {
              source: 'network',
              description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
              sourceLocation: {url: 'http://localhost:10200/dobetterweb/fcp-delayer.js?delay=5000'},
            },
            4: {
              // In the DT runner, the initial page load before staring Lighthouse will prevent this error.
              _excludeRunner: 'devtools',
              source: 'network',
              description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
              sourceLocation: {url: 'http://localhost:10200/favicon.ico'},
            },
            // In legacy Lighthouse this audit will have additional duplicate failures which are a mistake.
            // Fraggle Rock ordering of gatherer `stopInstrumentation` and `getArtifact` fixes the re-request issue.
          },
        },
      },
      'is-on-https': {
        score: 0,
        details: {
          items: [
            {
              url: 'http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js',
              resolution: 'Allowed',
            },
          ],
        },
      },
      'geolocation-on-start': {
        score: 0,
      },
      'no-document-write': {
        score: 0,
        details: {
          items: {
            length: 3,
          },
        },
      },
      'notification-on-start': {
        score: 0,
      },
      'render-blocking-resources': {
        score: '<1',
        numericValue: '>100',
        details: {
          items: [
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=100',
            },
            {
              url: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
            },
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2200',
            },
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
            },
            {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.js',
            },
            {
              url: 'http://localhost:10200/dobetterweb/fcp-delayer.js?delay=5000',
            },
          ],
        },
      },
      'uses-passive-event-listeners': {
        score: 0,
        details: {
          items: {
          // Note: Originally this was 7 but M56 defaults document-level
          // listeners to passive. See https://chromestatus.com/features/5093566007214080
          // Note: It was 4, but {passive:false} doesn't get a warning as of M63: https://crbug.com/770208
          // Note: It was 3, but wheel events are now also passive as of field trial in M71 https://crbug.com/626196
            length: '>=1',
          },
        },
      },
      'deprecations': {
        // see https://github.com/GoogleChrome/lighthouse/issues/13895
        score: 0,
        details: {
          items: [
            {
              // This feature was removed in M110.
              // TODO: Remove this expectation once M110 reaches stable.
              _maxChromiumVersion: '109',
              value: /`window.webkitStorageInfo` is deprecated/,
              source: {
                type: 'source-location',
                url: 'http://localhost:10200/dobetterweb/dbw_tester.js',
                urlProvider: 'network',
                line: '>0',
                column: 9,
              },
              subItems: undefined,
            },
            {
              value: /Synchronous `XMLHttpRequest` on the main thread is deprecated/,
              source: {
                type: 'source-location',
                url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
                urlProvider: 'network',
                line: '>0',
                column: 6,
              },
              subItems: undefined,
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
      'efficient-animated-content': {
        score: '<0.5',
        details: {
          overallSavingsMs: '>2000',
          items: [
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-rotating.gif',
              totalBytes: 934285,
              wastedBytes: 682028,
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
      'dom-size': {
        score: 1,
        numericValue: 153,
        details: {
          items: [
            {
              statistic: 'Total DOM Elements',
              value: {
                type: 'numeric',
                granularity: 1,
                value: 153,
              },
            },
            {
              statistic: 'Maximum DOM Depth',
              value: {
                type: 'numeric',
                granularity: 1,
                value: 4,
              },
            },
            {
              statistic: 'Maximum Child Elements',
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
      'no-unload-listeners': {
        score: 0,
        details: {
          items: [{
            source: {
              type: 'source-location',
              url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
              urlProvider: 'network',
              line: '>300',
              column: '>30',
            },
          }],
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
              // Support for this was added in M109
              // https://crbug.com/1350944
              _maxChromiumVersion: '108',
              reason: 'Pages that have requested notifications permissions are not currently eligible for back/forward cache.',
              failureType: 'Pending browser support',
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
            {
              // The DevTools runner uses Puppeteer to launch Chrome which disables BFCache by default.
              // https://github.com/puppeteer/puppeteer/issues/8197
              //
              // If we ignore the Puppeteer args and force BFCache to be enabled, it causes thew viewport to be sized incorrectly for other tests.
              // These viewport issues are not present when Lighthouse is run from DevTools manually.
              // TODO: Investigate why BFCache causes viewport issues only in our DevTools smoke tests.
              _runner: 'devtools',
              reason: 'Back/forward cache is disabled by flags. Visit chrome://flags/#back-forward-cache to enable it locally on this device.',
              failureType: 'Not actionable',
              subItems: {
                items: [{
                  frameUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
                }],
              },
            },
          ],
        },
      },
      'prioritize-lcp-image': {
        // In CI, there can sometimes be slight savings.
        numericValue: '<=50',
        details: {
          items: [{
            node: {
              snippet: '<h2 id="toppy" style="background-image:url(\'\');">',
              nodeLabel: 'Do better web tester page',
            },
            url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?redirected-lcp',
            wastedMs: '<=50',
          }],
          debugData: {
            initiatorPath: [{
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?redirected-lcp',
              initiatorType: 'redirect',
            }, {
              url: 'http://localhost:10200/dobetterweb/lighthouse-1024x680.jpg?lcp&redirect=lighthouse-1024x680.jpg%3Fredirected-lcp',
              initiatorType: 'parser',
            }, {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2000&async=true',
              initiatorType: 'parser',
            }, {
              url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
              initiatorType: 'other',
            }],
            pathLength: 4,
          },
        },
      },
      'metrics': {
        // Flaky in DevTools
        _excludeRunner: 'devtools',
        details: {items: {0: {
          timeToFirstByte: '450+/-100',
          lcpLoadStart: '5500+/-500',
          lcpLoadEnd: '5500+/-500',
        }}},
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
