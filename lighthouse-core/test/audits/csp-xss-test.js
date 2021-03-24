/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CspXss = require('../../audits/csp-xss.js');
const {Type} = require('csp_evaluator/dist/finding.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

it('audit basic header', async () => {
  const artifacts = {
    URL: 'https://example.com',
    MetaElements: [],
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {name: 'Content-Security-Policy', value: `script-src 'nonce-12345678'; foo-bar 'none'`},
          ],
        },
      ]),
    },
  };
  const results = await CspXss.audit(artifacts, {computedCache: new Map()});
  expect(results.details.items).toMatchObject(
    [
      {
        description: {
          value:
            'script-src \'nonce-12345678\'; foo-bar \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
      {
        description: {
          formattedDefault:
          'Elements controlled by `object-src` are considered legacy features. ' +
          'Consider setting `object-src` to `none` to prevent the injection of ' +
          'plugins that execute unsafe scripts.',
        },
        directive: 'object-src',
      },
      {
        description: {
          formattedDefault:
            'Missing `base-uri` allows injected `<base>` tags to set the base URL for all ' +
            'relative URLs (e.g. scripts) to an attacker controlled domain. ' +
            'Consider setting `base-uri` to `none` or `self`.',
        },
        directive: 'base-uri',
      },
      {
        description: {
          formattedDefault:
          'No CSP configures a reporting destination. ' +
          'This makes it difficult to maintain the CSP over time and monitor for any breakages.',
        },
        directive: 'report-uri',
      },
      {
        description: {
          formattedDefault:
            'Consider adding `unsafe-inline` (ignored by browsers supporting ' +
            'nonces/hashes) to be backward compatible with older browsers.',
        },
        directive: 'script-src',
      },
    ]
  );
});

it('adds result when using meta tag', async () => {
  const artifacts = {
    URL: 'https://example.com',
    MetaElements: [
      {
        httpEquiv: 'Content-Security-Policy',
        content: `base-uri 'none'`,
      },
    ],
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {name: 'Content-Security-Policy', value: `script-src 'none'; object-src 'none'; report-uri https://example.com`},
          ],
        },
      ]),
    },
  };
  const results = await CspXss.audit(artifacts, {computedCache: new Map()});
  expect(results.details.items).toHaveLength(1);
  expect(results.details.items[0]).toMatchObject(
    {
      description: {
        formattedDefault:
        'The page contains a CSP defined in a <meta> tag. ' +
        'Consider defining the CSP in an HTTP header if you can.',
      },
      directive: undefined,
    }
  );
});

describe('getRawCsps', () => {
  it('basic case', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [
        {
          httpEquiv: 'Content-Security-Policy',
          content: `default-src 'none'`,
        },
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: `script-src 'none'`,
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `script-src 'none'`,
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([
      `default-src 'none'`,
    ]);
  });

  it('split on comma', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: `script-src 'none',default-src 'none'`,
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `script-src 'none'`,
      `default-src 'none'`,
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([]);
  });

  it('ignore if empty', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: ``,
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([]);
  });

  it('ignore if only whitespace', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: '   \t',
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([]);
  });
});

describe('constructSyntaxResults', () => {
  it('single syntax error', () => {
    const rawCsps = [`foo-bar 'none'`];
    const syntaxFindings = [
      [{type: Type.UNKNOWN_DIRECTIVE, directive: 'foo-bar'}],
    ];
    const results = CspXss.constructSyntaxResults(syntaxFindings, rawCsps);
    expect(results).toMatchObject([
      {
        description: {
          value: 'foo-bar \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
    ]);
  });

  it('no syntax errors', () => {
    const rawCsps = [
      `script-src 'none'`,
      `object-src 'none'`,
    ];
    const syntaxFindings = [[]];
    const results = CspXss.constructSyntaxResults(syntaxFindings, rawCsps);
    expect(results).toEqual([]);
  });

  it('multiple syntax errors', () => {
    const rawCsps = [`foo-bar 'asdf'`];
    const syntaxFindings = [
      [
        {type: Type.UNKNOWN_DIRECTIVE, directive: 'foo-bar'},
        {type: Type.INVALID_KEYWORD, directive: 'foo-bar', value: '\'asdf\''},
      ],
    ];
    const results = CspXss.constructSyntaxResults(syntaxFindings, rawCsps);
    expect(results).toMatchObject([
      {
        description: {
          value: 'foo-bar \'asdf\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
            {
              description: {
                formattedDefault: '\'asdf\' seems to be an invalid keyword.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
    ]);
  });

  it('multiple CSPs', () => {
    const rawCsps = [`foo-bar 'none'`, `object-src 'asdf'`];
    const syntaxFindings = [
      [
        {type: Type.UNKNOWN_DIRECTIVE, directive: 'foo-bar'},
      ],
      [
        {type: Type.INVALID_KEYWORD, directive: 'object-src', value: '\'asdf\''},
      ],
    ];
    const results = CspXss.constructSyntaxResults(syntaxFindings, rawCsps);
    expect(results).toMatchObject([
      {
        description: {
          value: 'foo-bar \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
      {
        description: {
          value: 'object-src \'asdf\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: '\'asdf\' seems to be an invalid keyword.',
              },
              directive: 'object-src',
            },
          ],
        },
      },
    ]);
  });
});
