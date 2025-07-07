/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import TrustedTypesXss from '../../audits/trusted-types-xss.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

it('marked N/A if no violations found', async () => {
  const artifacts = {
    MetaElements: [],
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
    DevtoolsLog: networkRecordsToDevtoolsLog([
      {
        url: 'https://example.com',
        responseHeaders: [
          {
            name: 'Content-Security-Policy',
            value:
                  `require-trusted-types-for 'script';report-uri /cspreport`,
          },
        ],
      },
    ]),
  };
  const results =
      await TrustedTypesXss.audit(artifacts, {computedCache: new Map()});
  expect(results.details.items).toHaveLength(0);
  expect(results.notApplicable).toBeTruthy();
});

it('marked N/A if no violations found in metatag', async () => {
  const artifacts = {
    MetaElements: [
      {
        httpEquiv: 'Content-Security-Policy',
        content: `require-trusted-types-for 'script';report-uri /cspreport`,
      },
    ],
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
    DevtoolsLog: networkRecordsToDevtoolsLog([
      {
        url: 'https://example.com',
        responseHeaders: [],
      },
    ]),
  };
  const results =
      await TrustedTypesXss.audit(artifacts, {computedCache: new Map()});
  expect(results.details.items).toHaveLength(0);
  expect(results.notApplicable).toBeTruthy();
});

it('No CSP but foo header found', async () => {
  const artifacts = {
    MetaElements: [],
    DevtoolsLog: networkRecordsToDevtoolsLog([
      {
        url: 'https://example.com',
        responseHeaders: [
          {name: 'Foo-Header', value: `some-value`},
        ],
      },
    ]),
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results =
      await TrustedTypesXss.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('High');
  expect(results.details.items[0].description)
      .toBeDisplayString(
          'No `Content-Security-Policy` header with Trusted Types directive found');
});

it('Unknown CSP directive.', async () => {
  const artifacts = {
    MetaElements: [],
    DevtoolsLog: networkRecordsToDevtoolsLog([
      {
        url: 'https://example.com',
        responseHeaders: [
          {name: 'Content-Security-Policy', value: `fooDirective`},
        ],
      },
    ]),
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results =
      await TrustedTypesXss.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('High');
  expect(results.details.items[0].description)
      .toBeDisplayString(
          'No `Content-Security-Policy` header with Trusted Types directive found');
});

it('Messed Trusted Types directive.', async () => {
  const artifacts = {
    MetaElements: [],
    DevtoolsLog: networkRecordsToDevtoolsLog([
      {
        url: 'https://example.com',
        responseHeaders: [
          {
            name: 'Content-Security-Policy',
            value: `require-trusted-types-for; 'script' report-uri /cspreport`,
          },
        ],
      },
    ]),
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results =
      await TrustedTypesXss.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('High');
  expect(results.details.items[0].description)
      .toBeDisplayString(
          'No `Content-Security-Policy` header with Trusted Types directive found');
});

describe('getRawCsps', () => {
  it('basic case', async () => {
    const artifacts = {
      MetaElements: [],
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      DevtoolsLog: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Content-Security-Policy',
              value: `require-trusted-types-for 'script';report-uri /cspreport`,
            },
          ],
        },
      ]),
    };
    const {cspHeaders, cspMetaTags} =
      await TrustedTypesXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([`require-trusted-types-for 'script';report-uri /cspreport`]);
    expect(cspMetaTags).toEqual([]);
  });

  it('basic case with metatag', async () => {
    const artifacts = {
      MetaElements: [
        {
          httpEquiv: 'Content-Security-Policy',
          content: `require-trusted-types-for 'script';report-uri /cspreport`,
        },
      ],
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      DevtoolsLog: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [],
        },
      ]),
    };
    const {cspHeaders, cspMetaTags} =
      await TrustedTypesXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([]);
    expect(cspMetaTags).toEqual([`require-trusted-types-for 'script';report-uri /cspreport`]);
  });

  it('ignore if empty', async () => {
    const artifacts = {
      MetaElements: [],
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      DevtoolsLog: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Content-Security-Policy',
              value: ``,
            },
          ],
        },
      ]),
    };
    const {cspHeaders, cspMetaTags} =
      await TrustedTypesXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([]);
    expect(cspMetaTags).toEqual([]);
  });

  it('ignore if only whitespace', async () => {
    const artifacts = {
      MetaElements: [],
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      DevtoolsLog: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Content-Security-Policy',
              value: '   \t',
            },
          ],
        },
      ]),
    };
    const {cspHeaders, cspMetaTags} =
      await TrustedTypesXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([]);
    expect(cspMetaTags).toEqual([]);
  });
});

describe('constructResults', () => {
  it('passes with no findings', () => {
    const {score, results} = TrustedTypesXss.constructResults(
        [`require-trusted-types-for 'script';report-uri /cspreport`], []);
    expect(score).toEqual(1);
    expect(results).toEqual([]);
  });

  it('passes with no findings in metatags', () => {
    const {score, results} = TrustedTypesXss.constructResults(
        [], [`require-trusted-types-for 'script';report-uri /cspreport`]);
    expect(score).toEqual(1);
    expect(results).toEqual([]);
  });

  it('constructs result based on misconfigured CSP header', () => {
    const {score, results} =
        TrustedTypesXss.constructResults(['foo-directive'], []);
    expect(score).toEqual(0);
    expect(results[0].severity).toBeDisplayString('High');
    expect(results[0].description)
        .toBeDisplayString(
            'No `Content-Security-Policy` header with Trusted Types directive found');
  });

  it('returns single item for no CSP', () => {
    const {score, results} = TrustedTypesXss.constructResults([], []);
    expect(score).toEqual(0);
    expect(results[0].severity).toBeDisplayString('High');
    expect(results[0].description)
        .toBeDisplayString(
            'No `Content-Security-Policy` header with Trusted Types directive found');
  });
});
