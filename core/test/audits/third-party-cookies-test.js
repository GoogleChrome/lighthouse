/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ThirdPartyCookies from '../../audits/third-party-cookies.js';

/**
 * @param {LH.Crdp.Audits.CookieIssueDetails[]} issues
 * @return {LH.Artifacts}
 */
function createArtifacts(issues) {
  return {
    // @ts-expect-error ignore n/a issue types
    InspectorIssues: {
      cookieIssue: issues,
    },
  };
}

describe('ThirdPartyCookies audit', () => {
  it('passes when no cookie issues were found', async () => {
    const result = await ThirdPartyCookies.audit(createArtifacts([]));

    expect(result.score).toEqual(1);
    expect(result.displayValue).toBeUndefined();

    if (result.details?.type !== 'table') throw new Error('No table details');
    expect(result.details.items).toHaveLength(0);
  });

  it('ignores cookie issues unrelated to third party deprecation', async () => {
    const artifacts = createArtifacts([
      {
        operation: 'ReadCookie',
        cookieWarningReasons: ['WarnDomainNonASCII'],
        cookieExclusionReasons: ['ExcludeSameSiteLax'],
        cookie: {
          domain: '.example.com',
          path: '/path1',
          name: 'cookie1',
        },
        cookieUrl: 'https://example.com/path1',
      },
    ]);

    const result = await ThirdPartyCookies.audit(artifacts);

    expect(result.score).toEqual(1);
    expect(result.displayValue).toBeUndefined();

    if (result.details?.type !== 'table') throw new Error('No table details');
    expect(result.details.items).toHaveLength(0);
  });

  it('ignores cookie issues with no cookie details or raw cookie line', async () => {
    const artifacts = createArtifacts([
      {
        operation: 'ReadCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        cookieUrl: 'https://example.com/path1',
      },
    ]);

    const result = await ThirdPartyCookies.audit(artifacts);

    expect(result.score).toEqual(1);
    expect(result.displayValue).toBeUndefined();

    if (result.details?.type !== 'table') throw new Error('No table details');
    expect(result.details.items).toHaveLength(0);
  });

  it('fails if third party cookie issue detected', async () => {
    const artifacts = createArtifacts([
      {
        operation: 'ReadCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        cookie: {
          domain: '.example.com',
          path: '/path1',
          name: 'cookie1',
        },
        cookieUrl: 'https://example.com/path1',
      },
      {
        operation: 'ReadCookie',
        cookieWarningReasons: [],
        cookieExclusionReasons: ['ExcludeThirdPartyPhaseout'],
        cookie: {
          domain: '.example.com',
          path: '/path2',
          name: 'cookie2',
        },
        cookieUrl: 'https://example.com/path2',
      },
    ]);

    const result = await ThirdPartyCookies.audit(artifacts);

    expect(result.score).toEqual(0);
    expect(result.displayValue).toBeDisplayString('2 cookies found');

    if (result.details?.type !== 'table') throw new Error('No table details');
    expect(result.details.items).toEqual([
      {name: 'cookie1', url: 'https://example.com/path1'},
      {name: 'cookie2', url: 'https://example.com/path2'},
    ]);
  });

  it('dedupes by cookie name&domain&path', async () => {
    const artifacts = createArtifacts([
      {
        operation: 'SetCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        cookie: {
          domain: '.example.com',
          path: '/path1',
          name: 'cookie1',
        },
        cookieUrl: 'https://example.com/path1',
      },
      {
        operation: 'ReadCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        cookie: {
          domain: '.example.com',
          path: '/path1',
          name: 'cookie1',
        },
        cookieUrl: 'https://example.com/path1',
      },
      {
        operation: 'ReadCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        cookie: {
          domain: '.example.com',
          path: '/path1',
          name: 'cookie2',
        },
        cookieUrl: 'https://example.com/path1',
      },
    ]);

    const result = await ThirdPartyCookies.audit(artifacts);

    expect(result.score).toEqual(0);
    expect(result.displayValue).toBeDisplayString('2 cookies found');

    if (result.details?.type !== 'table') throw new Error('No table details');
    expect(result.details.items).toEqual([
      {name: 'cookie1', url: 'https://example.com/path1'},
      {name: 'cookie2', url: 'https://example.com/path1'},
    ]);
  });

  it('uses raw cookie line if cookie field is unset', async () => {
    const artifacts = createArtifacts([
      {
        operation: 'SetCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        rawCookieLine: 'raw_line_1',
        cookieUrl: 'https://example.com/path1',
      },
      {
        operation: 'ReadCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        rawCookieLine: 'raw_line_1',
        cookieUrl: 'https://example.com/path1',
      },
      {
        operation: 'ReadCookie',
        cookieWarningReasons: ['WarnThirdPartyPhaseout'],
        cookieExclusionReasons: [],
        rawCookieLine: 'raw_line_2',
        cookieUrl: 'https://example.com/path2',
      },
    ]);

    const result = await ThirdPartyCookies.audit(artifacts);

    expect(result.score).toEqual(0);
    expect(result.displayValue).toBeDisplayString('2 cookies found');

    if (result.details?.type !== 'table') throw new Error('No table details');
    expect(result.details.items).toEqual([
      {name: 'raw_line_1', url: 'https://example.com/path1'},
      {name: 'raw_line_2', url: 'https://example.com/path2'},
    ]);
  });
});
