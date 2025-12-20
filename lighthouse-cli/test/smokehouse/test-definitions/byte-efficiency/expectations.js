/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for byte efficiency tests
 */
const expectations = [
  {
    artifacts: {
      ScriptElements: [
        {
          type: null,
          src: null,
          async: false,
          defer: false,
          source: 'head',
          // Only do a single assertion for `devtoolsNodePath`: this can be flaky for elements
          // deep in the DOM, and the sample LHR test has plenty of places that would catch
          // a regression in `devtoolsNodePath` calculation. Keep just one for the benefit
          // of other smoke test runners.
          devtoolsNodePath: '2,HTML,0,HEAD,3,SCRIPT',
        },
        {
          type: 'application/javascript',
          src: 'http://localhost:10200/byte-efficiency/script.js',
          async: false,
          defer: false,
          source: 'head',
        },
        {
          type: null,
          src: 'http://localhost:10200/byte-efficiency/bundle.js',
          async: false,
          defer: false,
          source: 'head',
        },
        {
          type: null,
          src: null,
          async: false,
          defer: false,
          source: 'body',
          content: /shadowRoot/,
        },
        {
          type: null,
          src: null,
          async: false,
          defer: false,
          source: 'body',
          content: /generateInlineStyleWithSize/,
        },
        {
          type: null,
          src: 'http://localhost:10200/byte-efficiency/delay-complete.js?delay=8000',
          async: true,
          defer: false,
          source: 'body',
        },
        {
          type: null,
          src: null,
          async: false,
          defer: false,
          source: 'body',
          content: /Used block #1/,
        },
        {
          type: null,
          src: null,
          async: false,
          defer: false,
          source: 'body',
          content: /Unused block #1/,
        },
      ],
    },
    lhr: {
      requestedUrl: 'http://localhost:10200/byte-efficiency/tester.html',
      finalUrl: 'http://localhost:10200/byte-efficiency/tester.html',
      audits: {
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
            overallSavingsMs: '>500',
            overallSavingsBytes: '>45000',
            items: [
              {
                url: 'http://localhost:10200/byte-efficiency/script.js',
                wastedBytes: '46481 +/- 100',
                wastedPercent: '87 +/- 5',
              },
              {
                url: 'inline: \n  function unusedFunction() {\n    // Un...',
                wastedBytes: '6581 +/- 100',
                wastedPercent: '99.6 +/- 0.1',
              },
              {
                url: 'inline: \n  // Used block #1\n  // FILLER DATA JUS...',
                wastedBytes: '6559 +/- 100',
                wastedPercent: 100,
              },
              {
                url: 'http://localhost:10200/byte-efficiency/bundle.js',
                totalBytes: '13000 +/- 1000',
                wastedBytes: '2350 +/- 100',
                wastedPercent: '19 +/- 5',
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
          details: {
            // the specific ms value here is not meaningful for this smoketest
            // *some* savings should be reported
            overallSavingsMs: '>0',
            overallSavingsBytes: '>=25000',
            items: [
              {
                url: 'http://localhost:10200/byte-efficiency/script.js',
                totalBytes: '53000 +/- 1000',
                wastedBytes: '22000 +/- 1000',
              },
              {
                url: 'http://localhost:10200/byte-efficiency/tester.html',
                totalBytes: '15000 +/- 1000',
                wastedBytes: '6500 +/- 1000',
              },
              {
                url: 'http://localhost:10200/byte-efficiency/bundle.js',
                totalBytes: '12913 +/- 1000',
                wastedBytes: '5827 +/- 200',
                sources: [
                  '…./b.js',
                  '…./c.js',
                  '…webpack/bootstrap',
                ],
                sourceBytes: [
                  '4417 +/- 50',
                  '2200 +/- 50',
                  '2809 +/- 50',
                ],
                sourceWastedBytes: [
                  '2191 +/- 50',
                  '2182 +/- 50',
                  '1259 +/- 50',
                ],
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
        'uses-webp-images': {
          details: {
            overallSavingsBytes: '>60000',
            items: {
              length: 5,
            },
          },
        },
        'uses-text-compression': {
          score: '<1',
          details: {
            // the specific ms value is not meaningful for this smoketest
            // *some largish amount* of savings should be reported
            overallSavingsMs: '>700',
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
        'uses-responsive-images': {
          details: {
            overallSavingsBytes: '108000 +/- 5000',
            items: {
              0: {wastedPercent: '56 +/- 5', url: /lighthouse-1024x680.jpg/},
              1: {wastedPercent: '78 +/- 5', url: /lighthouse-2048x1356.webp\?size0/},
              2: {wastedPercent: '56 +/- 5', url: /lighthouse-480x320.webp/},
              3: {wastedPercent: '20 +/- 5', url: /lighthouse-480x320.jpg/},
              length: 4,
            },
          },
        },
      },
    },
  },
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/byte-efficiency/gzip.html',
      finalUrl: 'http://localhost:10200/byte-efficiency/gzip.html',
      audits: {
        'network-requests': {
          details: {
            items: [
              {
                url: 'http://localhost:10200/byte-efficiency/gzip.html',
                finished: true,
              },
              {
                url: 'http://localhost:10200/byte-efficiency/script.js?gzip=1',
                transferSize: '1100 +/- 100',
                resourceSize: '53000 +/- 1000',
                finished: true,
              },
              {
                url: 'http://localhost:10200/byte-efficiency/script.js',
                transferSize: '53200 +/- 1000',
                resourceSize: '53000 +/- 1000',
                finished: true,
              },
              {
                url: 'http://localhost:10200/favicon.ico',
                finished: true,
              },
            ],
          },
        },
      },
    },
  },
];

module.exports = expectations;
