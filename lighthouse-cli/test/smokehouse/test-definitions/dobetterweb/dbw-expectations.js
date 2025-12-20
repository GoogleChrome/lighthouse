/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for Do Better Web tests.
 */
const expectations = [
  {
    artifacts: {
      HostFormFactor: 'desktop',
      TestedAsMobileDevice: true,
      Stacks: [{
        id: 'jquery',
      }, {
        id: 'jquery-fast',
        name: 'jQuery (Fast path)',
      }, {
        id: 'wordpress',
      }],
      MainDocumentContent: /^<!doctype html>.*DoBetterWeb Mega Tester.*aggressive-promise-polyfill.*<\/html>\n$/s,
      LinkElements: [
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=100',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=100',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
          hrefRaw: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2200',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2200',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/dbw_disabled.css?delay=200&isdisabled',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_disabled.css?delay=200&isdisabled',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'import',
          href: 'http://localhost:10200/dobetterweb/dbw_partial_a.html?delay=200',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_partial_a.html?delay=200',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'import',
          href: 'http://localhost:10200/dobetterweb/dbw_partial_b.html?delay=200&isasync',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_partial_b.html?delay=200&isasync',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&capped',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2000&async=true',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=2000&async=true',
          hreflang: '',
          as: 'style',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&async=true',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_tester.css?delay=3000&async=true',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'alternate stylesheet',
          href: 'http://localhost:10200/dobetterweb/empty.css',
          hrefRaw: 'http://localhost:10200/dobetterweb/empty.css',
          hreflang: '',
          as: '',
          crossOrigin: null,
          source: 'head',
        },
        {
          rel: 'stylesheet',
          href: 'http://localhost:10200/dobetterweb/dbw_tester.css?scriptActivated&delay=200',
          hrefRaw: 'http://localhost:10200/dobetterweb/dbw_tester.css?scriptActivated&delay=200',
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
            url: 'http://localhost:10200/dobetterweb/dbw_partial_a.html?delay=200',
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
    },
    lhr: {
      requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      finalUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      audits: {
        'errors-in-console': {
          score: 0,
          details: {
            items: [
              {
                source: 'other',
                description: 'Application Cache Error event: Manifest fetch failed (404) http://localhost:10200/dobetterweb/clock.appcache',
                url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
              },
              {
                source: 'Runtime.exception',
                description: /^Error: A distinctive error\s+at http:\/\/localhost:10200\/dobetterweb\/dbw_tester.html:\d+:\d+$/,
                url: 'http://localhost:10200/dobetterweb/dbw_tester.html',
              },
              {
                source: 'network',
                description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
                url: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
              },
              {
                source: 'network',
                description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
                url: 'http://localhost:10200/dobetterweb/fcp-delayer.js?delay=5000',
              },
              {
                source: 'network',
                description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
                url: 'http://localhost:10200/favicon.ico',
              },
              {
                source: 'network',
                description: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
                url: 'http://localhost:10200/dobetterweb/unknown404.css?delay=200',
              },
            ],
          },
        },
        'is-on-https': {
          score: 0,
          details: {
            items: {
              length: 1,
            },
          },
        },
        'uses-http2': {
          score: 0,
          details: {
            items: {
              length: '>15',
            },
          },
        },
        'external-anchors-use-rel-noopener': {
          score: 0,
          warnings: [/Unable to determine.*<a target="_blank">/],
          details: {
            items: {
              length: 3,
            },
          },
        },
        'appcache-manifest': {
          score: 0,
          displayValue: 'Found "clock.appcache"',
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
        'no-vulnerable-libraries': {
          score: 0,
          details: {
            items: {
              length: 1,
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
                url: 'http://localhost:10200/dobetterweb/dbw_partial_a.html?delay=200',
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
            // listeners to passive. See https://www.chromestatus.com/features/5093566007214080
            // Note: It was 4, but {passive:false} doesn't get a warning as of M63: https://crbug.com/770208
            // Note: It was 3, but wheel events are now also passive as of field trial in M71 https://crbug.com/626196
              length: '>=1',
            },
          },
        },
        'deprecations': {
          score: 0,
          details: {
            items: {
            // Note: HTML Imports added to deprecations in m70, so 3 before, 4 after.
              length: '>=3',
            },
          },
        },
        'password-inputs-can-be-pasted-into': {
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
                url: 'http://localhost:10200/dobetterweb/lighthouse-480x318.jpg?iar1',
              },
              length: 1,
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
          score: 1,
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
          numericValue: 147,
          details: {
            items: [
              {statistic: 'Total DOM Elements', value: '147'},
              {statistic: 'Maximum DOM Depth', value: '4'},
              {
                statistic: 'Maximum Child Elements',
                value: '100',
                element: {value: '<div id="shadow-root-container">'},
              },
            ],
          },
        },
      },
    },
  },
  // TODO: Uncomment when Chrome m84 lands
  // {
  //   artifacts: {
  //     InspectorIssues: {
  //       mixedContent: [
  //         {
  //           resourceType: 'Image',
  //           resolutionStatus: 'MixedContentWarning',
  //           insecureURL: 'http://www.mixedcontentexamples.com/Content/Test/steveholt.jpg',
  //           mainResourceURL: 'https://www.mixedcontentexamples.com/Test/NonSecureImage',
  //           request: {
  //             url: 'http://www.mixedcontentexamples.com/Content/Test/steveholt.jpg',
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   lhr: {
  //     requestedUrl: 'https://www.mixedcontentexamples.com/Test/NonSecureImage',
  //     finalUrl: 'https://www.mixedcontentexamples.com/Test/NonSecureImage',
  //     audits: {
  //       'is-on-https': {
  //         score: 0,
  //       },
  //     },
  //   },
  // },
];

module.exports = expectations;
