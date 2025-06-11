/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site that fails seo tests.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/font-size.html',
    finalDisplayedUrl: 'http://localhost:10200/font-size.html',
    audits: {
      'font-size': {
        score: 1,
        details: {
          items: [
            {
              source: {
                url: 'http://localhost:10200/font-size.html',
                urlProvider: 'network',
                line: 6,
                column: 12,
              },
              selector: '.small',
              fontSize: '11px',
            },
            {
              source: {
                url: 'http://localhost:10200/font-size.html',
                urlProvider: 'network',
                line: 10,
                column: 55,
              },
              selector: '.small-2',
              fontSize: '11px',
            },
            {
              source: {
                url: 'font-size-inline-magic.css',
                urlProvider: 'comment',
                line: 2,
                column: 14,
              },
              selector: '.small-3',
              fontSize: '6px',
            },
            {
              source: {
                url: 'font-size-styles-magic.css',
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
              source: {type: 'url', value: 'http://localhost:10200/font-size.html'},
              selector: {
                type: 'node',
                selector: 'body',
                snippet: '<font size="1">',
              },
              fontSize: '10px',
            },
            {
              source: {type: 'url', value: 'http://localhost:10200/font-size.html'},
              selector: {
                type: 'node',
                selector: 'font',
                snippet: '<b>',
              },
              fontSize: '10px',
            },
            {
              source: {type: 'url', value: 'http://localhost:10200/font-size.html'},
              selector: {
                type: 'node',
                selector: 'div',
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
    },
  },
};

export default {
  id: 'font-size',
  expectations,
};

