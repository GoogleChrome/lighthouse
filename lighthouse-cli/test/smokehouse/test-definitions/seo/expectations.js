/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BASE_URL = 'http://localhost:10200/seo/';

/**
 * @param {[string, string][]} headers
 * @return {string}
 */
function headersParam(headers) {
  const headerString = new URLSearchParams(headers).toString();
  return new URLSearchParams([['extra_header', headerString]]).toString();
}

const expectedGatheredTapTargets = [
  {
    snippet: /large-link-at-bottom-of-page/,
  },
  {
    snippet: /visible-target/,
  },
  {
    snippet: /target-with-client-rect-outside-scroll-container/,
  },
  {
    snippet: /link-containing-large-inline-block-element/,
  },
  {
    snippet: /link-next-to-link-containing-large-inline-block-element/,
  },
  {
    snippet: /tap-target-containing-other-tap-targets/,
  },
  {
    snippet: /child-client-rect-hidden-by-overflow-hidden/,
  },
  {
    snippet: /tap-target-next-to-child-client-rect-hidden-by-overflow-hidden/,
  },
  {
    snippet: /child-client-rect-overlapping-other-target/,
    shouldFail: true,
  },
  {
    snippet: /tap-target-overlapped-by-other-targets-position-absolute-child-rect/,
    shouldFail: true,
  },
  {
    snippet: /position-absolute-tap-target-fully-contained-in-other-target/,
  },
  {
    snippet: /tap-target-fully-containing-position-absolute-target/,
  },
  {
    snippet: /too-small-failing-tap-target/,
    shouldFail: true,
  },
  {
    snippet: /large-enough-tap-target-next-to-too-small-tap-target/,
  },
  {
    snippet: /zero-width-tap-target-with-overflowing-child-content/,
    shouldFail: true,
  },
  {
    snippet: /passing-tap-target-next-to-zero-width-target/,
  },
  {
    snippet: /links-with-same-link-target-1/,
  },
  {
    snippet: /links-with-same-link-target-2/,
  },
];

const failureHeaders = headersParam([[
  'x-robots-tag',
  'none',
], [
  'link',
  '<http://example.com>;rel="alternate";hreflang="xx"',
], [
  'link',
  '<https://example.com>; rel="canonical"',
]]);

const passHeaders = headersParam([[
  'link',
  '<http://localhost:10200/seo/>; rel="canonical"',
]]);

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for seo tests
 */
const expectations = [
  {
    lhr: {
      requestedUrl: BASE_URL + 'seo-tester.html?' + passHeaders,
      finalUrl: BASE_URL + 'seo-tester.html?' + passHeaders,
      audits: {
        'viewport': {
          score: 1,
        },
        'document-title': {
          score: 1,
        },
        'meta-description': {
          score: 1,
        },
        'http-status-code': {
          score: 1,
        },
        'font-size': {
          score: 1,
          details: {
            items: [
              {
                source: {
                  url: /seo-tester\.html.+$/,
                  urlProvider: 'network',
                  line: 23,
                  column: 12,
                },
                selector: '.small',
                fontSize: '11px',
              },
              {
                source: {
                  url: /seo-tester\.html.+$/,
                  urlProvider: 'network',
                  line: 27,
                  column: 55,
                },
                selector: '.small-2',
                fontSize: '11px',
              },
              {
                source: {
                  url: /seo-tester-inline-magic\.css$/,
                  urlProvider: 'comment',
                  line: 2,
                  column: 14,
                },
                selector: '.small-3',
                fontSize: '6px',
              },
              {
                source: {
                  url: /seo-tester-styles-magic\.css$/,
                  urlProvider: 'comment',
                  line: 2,
                  column: 10,
                },
                selector: '.small-4',
                fontSize: '6px',
              },
              {
                source: {type: 'code', value: 'User Agent Stylesheet'},
                selector: 'h6',
                fontSize: '10.72px',
              },
              {
                source: {type: 'url', value: /seo-tester\.html.+$/},
                selector: {
                  type: 'node',
                  selector: 'body',
                  snippet: '<font size="1">',
                },
                fontSize: '10px',
              },
              {
                source: {type: 'url', value: /seo-tester\.html.+$/},
                selector: {
                  type: 'node',
                  selector: 'font',
                  snippet: '<b>',
                },
                fontSize: '10px',
              },
              {
                source: {type: 'url', value: /seo-tester\.html.+$/},
                selector: {
                  type: 'node',
                  selector: 'body',
                  snippet: '<p style="font-size:10px">',
                },
                fontSize: '10px',
              },
              {
                source: {type: 'code', value: 'Legible text'},
                selector: '',
                fontSize: '≥ 12px',
              },
            ],
          },
        },
        'crawlable-anchors': {
          score: 1,
        },
        'link-text': {
          score: 1,
        },
        'is-crawlable': {
          score: 1,
        },
        'hreflang': {
          score: 1,
        },
        'plugins': {
          score: 1,
        },
        'canonical': {
          score: 1,
        },
        'robots-txt': {
          score: null,
          scoreDisplayMode: 'notApplicable',
        },
      },
    }},
  {
    lhr: {
      requestedUrl: BASE_URL + 'seo-failure-cases.html?' + failureHeaders,
      finalUrl: BASE_URL + 'seo-failure-cases.html?' + failureHeaders,
      audits: {
        'viewport': {
          score: 0,
        },
        'document-title': {
          score: 0,
        },
        'meta-description': {
          score: 0,
        },
        'http-status-code': {
          score: 1,
        },
        'font-size': {
          score: 0,
          explanation:
          'Text is illegible because there\'s no viewport meta tag optimized for mobile screens.',
        },
        'crawlable-anchors': {
          score: 0,
          details: {
            items: {
              length: 4,
            },
          },
        },
        'link-text': {
          score: 0,
          displayValue: '4 links found',
          details: {
            items: {
              length: 4,
            },
          },
        },
        'is-crawlable': {
          score: 0,
          details: {
            items: {
              length: 2,
            },
          },
        },
        'hreflang': {
          score: 0,
          details: {
            items: {
              length: 3,
            },
          },
        },
        'plugins': {
          score: 0,
          details: {
            items: {
              length: 3,
            },
          },
        },
        'canonical': {
          score: 0,
          explanation: 'Multiple conflicting URLs (https://example.com/other, https://example.com/)',
        },
      },
    },
  },
  {
    lhr: {
      // Note: most scores are null (audit error) because the page 403ed.
      requestedUrl: BASE_URL + 'seo-failure-cases.html?status_code=403',
      finalUrl: BASE_URL + 'seo-failure-cases.html?status_code=403',
      runtimeError: {
        code: 'ERRORED_DOCUMENT_REQUEST',
        message: /Status code: 403/,
      },
      runWarnings: ['Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests. (Status code: 403)'],
      audits: {
        'http-status-code': {
          score: null,
        },
        'viewport': {
          score: null,
        },
        'document-title': {
          score: null,
        },
        'meta-description': {
          score: null,
        },
        'font-size': {
          score: null,
        },
        'crawlable-anchors': {
          score: null,
        },
        'link-text': {
          score: null,
        },
        'is-crawlable': {
          score: null,
        },
        'hreflang': {
          score: null,
        },
        'plugins': {
          score: null,
        },
        'canonical': {
          score: null,
        },
      },
    }},
  {
    lhr: {
      finalUrl: BASE_URL + 'seo-tap-targets.html',
      requestedUrl: BASE_URL + 'seo-tap-targets.html',
      audits: {
        'tap-targets': {
          score: (() => {
            const totalTapTargets = expectedGatheredTapTargets.length;
            const passingTapTargets = expectedGatheredTapTargets.filter(t => !t.shouldFail).length;
            const SCORE_FACTOR = 0.89;
            return Math.round(passingTapTargets / totalTapTargets * SCORE_FACTOR * 100) / 100;
          })(),
          details: {
            items: [
              {
                'tapTarget': {
                  'type': 'node',
                  /* eslint-disable max-len */
                  'snippet': '<a data-gathered-target="zero-width-tap-target-with-overflowing-child-content" style="display: block; width: 0; white-space: nowrap">\n        <!-- TODO: having the span should not be necessary to cause a failure here, but\n             right now we don\'t try to get the client rects of children that …',
                  'path': '2,HTML,1,BODY,14,DIV,0,A',
                  'selector': 'body > div > a',
                  'nodeLabel': 'zero width target',
                },
                'overlappingTarget': {
                  'type': 'node',
                  /* eslint-disable max-len */
                  'snippet': '<a data-gathered-target="passing-tap-target-next-to-zero-width-target" style="display: block; width: 110px; height: 100px;background: #aaa;">\n        passing target\n      </a>',
                  'path': '2,HTML,1,BODY,14,DIV,1,A',
                  'selector': 'body > div > a',
                  'nodeLabel': 'passing target',
                },
                'tapTargetScore': 864,
                'overlappingTargetScore': 720,
                'overlapScoreRatio': 0.8333333333333334,
                'size': '110x18',
                'width': 110,
                'height': 18,
              },
              {
                'tapTarget': {
                  'type': 'node',
                  'path': '2,HTML,1,BODY,10,DIV,0,DIV,1,A',
                  'selector': 'body > div > div > a',
                  'nodeLabel': 'too small target',
                },
                'overlappingTarget': {
                  'type': 'node',
                  'path': '2,HTML,1,BODY,10,DIV,0,DIV,2,A',
                  'selector': 'body > div > div > a',
                  'nodeLabel': 'big enough target',
                },
                'tapTargetScore': 1440,
                'overlappingTargetScore': 432,
                'overlapScoreRatio': 0.3,
                'size': '100x30',
                'width': 100,
                'height': 30,
              },
              {
                'tapTarget': {
                  'type': 'node',
                  'path': '2,HTML,1,BODY,3,DIV,24,A',
                  'selector': 'body > div > a',
                  'nodeLabel': 'left',
                },
                'overlappingTarget': {
                  'type': 'node',
                  'path': '2,HTML,1,BODY,3,DIV,25,A',
                  'selector': 'body > div > a',
                  'nodeLabel': 'right',
                },
                'tapTargetScore': 1920,
                'overlappingTargetScore': 560,
                'overlapScoreRatio': 0.2916666666666667,
                'size': '40x40',
                'width': 40,
                'height': 40,
              },
            ],
          },
        },
      },
    },
    artifacts: {
      TapTargets: expectedGatheredTapTargets.map(({snippet}) => ({snippet})),
    },
  },
];

module.exports = expectations;
