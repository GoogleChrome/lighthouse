/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import HasHsts from '../../audits/has-hsts.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

it('marked N/A if no violations found', async () => {
  const artifacts = {
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Strict-Transport-Security',
              value: `max-age=63072000; includeSubDomains; preload`,
            },
          ],
        },
      ]),
    },
  };
  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.details.items).toHaveLength(0);
  expect(results.notApplicable).toBeTruthy();
});

it('max-age missing, but other directives present', async () => {
  const artifacts = {
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Strict-Transport-Security',
              value: `includeSubDomains; preload`,
            },
          ],
        },
      ]),
    },
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('High');
  expect(results.details.items[0].description)
      .toBeDisplayString('No `max-age` directive');
  expect(results.details.items).toMatchObject([
    {
      directive: 'max-age',
    },
  ]);
});

it('max-age too low, but other directives present', async () => {
  const artifacts = {
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Strict-Transport-Security',
              value: `max-age=1337; includeSubDomains; preload`,
            },
          ],
        },
      ]),
    },
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('High');
  expect(results.details.items[0].description)
      .toBeDisplayString('`max-age` is too low');
  expect(results.details.items).toMatchObject([
    {
      directive: 'max-age',
    },
  ]);
});

it('includeSubDomains missing, but other directives present', async () => {
  const artifacts = {
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Strict-Transport-Security',
              value: `max-age=63072000; preload`,
            },
          ],
        },
      ]),
    },
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('Medium');
  expect(results.details.items[0].description)
      .toBeDisplayString('No `includeSubDomains` directive found');
  expect(results.details.items).toMatchObject([
    {
      directive: 'includeSubDomains',
    },
  ]);
});

it('preload missing, but other directives present', async () => {
  const artifacts = {
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Strict-Transport-Security',
              value: `max-age=63072000; includeSubDomains`,
            },
          ],
        },
      ]),
    },
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('Medium');
  expect(results.details.items[0].description)
      .toBeDisplayString('No `preload` directive found');
  expect(results.details.items).toMatchObject([
    {
      directive: 'preload',
    },
  ]);
});

it('No HSTS header found', async () => {
  const artifacts = {
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Foo-Header',
              value: `max-age=63072000; includeSubDomains; preload`,
            },
          ],
        },
      ]),
    },
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('High');
  expect(results.details.items[0].description)
      .toBeDisplayString('No HSTS header found');
  expect(results.details.items).toMatchObject([
    {
      directive: undefined,
    },
  ]);
});

it('Messed up directive, but other actual HSTS directives present.', async () => {
  const artifacts = {
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Strict-Transport-Security',
              value:
                  `max-age=63072000; fooDirective; includeSubDomains; preload`,
            },
          ],
        },
      ]),
    },
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('Low');
  expect(results.details.items[0].description)
      .toBeDisplayString('Invalid syntax');
  expect(results.details.items).toMatchObject([
    {
      directive: 'foodirective',
    },
  ]);
});

it('Messed up directive and one more directive missing.', async () => {
  const artifacts = {
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {
              name: 'Strict-Transport-Security',
              value: `max-age=63072000; fooDirective; preload`,
            },
          ],
        },
      ]),
    },
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
  };

  const results = await HasHsts.audit(artifacts, {computedCache: new Map()});
  expect(results.notApplicable).toBeFalsy();
  expect(results.details.items[0].severity).toBeDisplayString('Medium');
  expect(results.details.items[0].description)
      .toBeDisplayString('No `includeSubDomains` directive found');
  expect(results.details.items[1].severity).toBeDisplayString('Low');
  expect(results.details.items[1].description)
      .toBeDisplayString('Invalid syntax');
  expect(results.details.items).toMatchObject([
    {
      directive: 'includeSubDomains',
    },
    {
      directive: 'foodirective',
    },
  ]);
});

describe('getRawHsts', () => {
  it('basic case', async () => {
    const artifacts = {
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Strict-Transport-Security',
                value: `max-age=63072000; includeSubDomains; preload`,
              },
            ],
          },
        ]),
      },
    };
    const hstsHeaders =
      await HasHsts.getRawHsts(artifacts, {computedCache: new Map()});
    expect(hstsHeaders).toEqual([
      `max-age=63072000`,
      `includesubdomains`,
      `preload`,
    ]);
  });

  it('ignore if empty', async () => {
    const artifacts = {
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Strict-Transport-Security',
                value: ``,
              },
            ],
          },
        ]),
      },
    };
    const hstsHeaders =
      await HasHsts.getRawHsts(artifacts, {computedCache: new Map()});
    expect(hstsHeaders).toEqual([
      ``,
    ]);
  });

  it('ignore if only whitespace', async () => {
    const artifacts = {
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Strict-Transport-Security',
                value: '   \t',
              },
            ],
          },
        ]),
      },
    };
    const hstsHeaders =
      await HasHsts.getRawHsts(artifacts, {computedCache: new Map()});
    expect(hstsHeaders).toEqual([
      ``,
    ]);
  });
});

describe('constructResults', () => {
  it('passes with no findings', () => {
    const {score, results} = HasHsts.constructResults(
        ['max-age=31536000', 'includesubdomains', 'preload']);
    expect(score).toEqual(1);
    expect(results).toEqual([]);
  });

  it('constructs result based on misconfigured HSTS header', () => {
    const {score, results} = HasHsts.constructResults(
        ['max-age=31536000', 'foo-directive', 'includesubdomains', 'preload']);
    expect(score).toEqual(0);
    expect(results[0].severity).toBeDisplayString('Low');
    expect(results[0].description).toBeDisplayString('Invalid syntax');
    expect(results).toMatchObject([
      {
        directive: 'foo-directive',
      },
    ]);
  });

  it('returns single item for no HSTS', () => {
    const {score, results} = HasHsts.constructResults([]);
    expect(score).toEqual(0);
    expect(results[0].severity).toBeDisplayString('High');
    expect(results[0].description).toBeDisplayString('No HSTS header found');
    expect(results).toMatchObject([
      {
        directive: undefined,
      },
    ]);
  });
});
