/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for perf tests.
 */
module.exports = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/preload.html',
      finalUrl: 'http://localhost:10200/preload.html',
      audits: {
        'speed-index': {
          score: '>=0.80', // primarily just making sure it didn't fail/go crazy, specific value isn't that important
        },
        'first-meaningful-paint': {
          score: '>=0.90', // primarily just making sure it didn't fail/go crazy, specific value isn't that important
        },
        'first-cpu-idle': {
          score: '>=0.90', // primarily just making sure it didn't fail/go crazy, specific value isn't that important
        },
        'interactive': {
          score: '>=0.90', // primarily just making sure it didn't fail/go crazy, specific value isn't that important
        },
        'server-response-time': {
          // Can be flaky, so test float numericValue instead of binary score
          numericValue: '<1000',
        },
        'network-requests': {
          details: {
            items: {
              length: '>5',
            },
          },
        },
        'uses-rel-preload': {
          score: '<1',
          numericValue: '>500',
          warnings: {
            0: /level-2.*warning/,
            length: 1,
          },
          details: {
            items: {
              length: 1,
            },
          },
        },
        'uses-rel-preconnect': {
          score: 1,
          warnings: {
            0: /fonts.googleapis/,
            length: 1,
          },
        },
      },
    },
  },
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/perf/perf-budgets/load-things.html',
      finalUrl: 'http://localhost:10200/perf/perf-budgets/load-things.html',
      audits: {
        'resource-summary': {
          score: null,
          displayValue: '10 requests • 164 KB',
          details: {
            items: [
              {resourceType: 'total', requestCount: 10, transferSize: '168000±1000'},
              {resourceType: 'font', requestCount: 2, transferSize: '80000±1000'},
              {resourceType: 'script', requestCount: 3, transferSize: '55000±1000'},
              {resourceType: 'image', requestCount: 2, transferSize: '28000±1000'},
              {resourceType: 'document', requestCount: 1, transferSize: '2200±100'},
              {resourceType: 'other', requestCount: 1, transferSize: '1000±50'},
              {resourceType: 'stylesheet', requestCount: 1, transferSize: '450±100'},
              {resourceType: 'media', requestCount: 0, transferSize: 0},
              {resourceType: 'third-party', requestCount: 0, transferSize: 0},
            ],
          },
        },
        'performance-budget': {
          score: null,
          details: {
            // Undefined items are asserting that the property isn't included in the table item.
            items: [
              {
                resourceType: 'total',
                countOverBudget: '2 requests',
                sizeOverBudget: '65000±1000',
              },
              {
                resourceType: 'script',
                countOverBudget: '2 requests',
                sizeOverBudget: '25000±1000',
              },
              {
                resourceType: 'font',
                countOverBudget: undefined,
                sizeOverBudget: '4000±500',
              },
              {
                resourceType: 'document',
                countOverBudget: '1 request',
                sizeOverBudget: '1200±50',
              },
              {
                resourceType: 'stylesheet',
                countOverBudget: undefined,
                sizeOverBudget: '450±100',
              },
              {
                resourceType: 'image',
                countOverBudget: '1 request',
                sizeOverBudget: undefined,
              },
              {
                resourceType: 'media',
                countOverBudget: undefined,
                sizeOverBudget: undefined,
              },
              {
                resourceType: 'other',
                countOverBudget: undefined,
                sizeOverBudget: undefined,
              },
              {
                resourceType: 'third-party',
                countOverBudget: undefined,
                sizeOverBudget: undefined,
              },
            ],
          },
        },
      },
    },
  },
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/perf/fonts.html',
      finalUrl: 'http://localhost:10200/perf/fonts.html',
      audits: {
        'font-display': {
          score: 0,
          details: {
            items: {
              length: 2,
            },
          },
        },
      },
    },
  },
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/perf/trace-elements.html',
      finalUrl: 'http://localhost:10200/perf/trace-elements.html',
      audits: {
        'largest-contentful-paint-element': {
          score: null,
          displayValue: '1 element found',
          details: {
            items: [
              {
                node: {
                  type: 'node',
                  nodeLabel: 'img',
                  selector: 'body > div#late-content > img',
                },
              },
            ],
          },
        },
        // TODO: uncomment when Chrome m84 lands
        // 'layout-shift-elements': {
        //   score: null,
        //   displayValue: '2 elements found',
        //   details: {
        //     items: {
        //       length: 2,
        //     },
        //   },
        // },
        'long-tasks': {
          score: null,
          details: {
            items: {
              0: {
                url: 'http://localhost:10200/perf/delayed-element.js',
                duration: '>500',
              },
            },
          },
        },
      },
    },
  },
];
