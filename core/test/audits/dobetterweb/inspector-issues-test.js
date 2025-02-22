/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import InspectorIssuesAudit from '../../../audits/dobetterweb/inspector-issues.js';

describe('Has inspector issues audit', () => {
  let issues;
  beforeEach(() => {
    issues = {
      attributionReportingIssue: [],
      blockedByResponseIssue: [],
      clientHintIssue: [],
      contentSecurityPolicyIssue: [],
      cookieDeprecationMetadataIssue: [],
      corsIssue: [],
      deprecationIssue: [],
      federatedAuthRequestIssue: [],
      genericIssue: [],
      heavyAdIssue: [],
      lowTextContrastIssue: [],
      mixedContentIssue: [],
      navigatorUserAgentIssue: [],
      quirksModeIssue: [],
      cookieIssue: [],
      sharedArrayBufferIssue: [],
    };
  });

  it('passes when no issues are found', () => {
    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(1);
    expect(auditResult.details.items).toHaveLength(0);
  });

  it('correctly displays mixed content issues', () => {
    const mixedContentIssues = [
      {
        resolutionStatus: 'MixedContentBlocked',
        insecureURL: 'www.mixedcontent.com',
        mainResourceURL: 'www.mixedcontent.com',
      },
      {
        resolutionStatus: 'MixedContentWarning',
        insecureURL: 'www.insecureurl.com',
        mainResourceURL: 'www.inscureurl.com',
        request: {
          requestId: '1',
          url: 'www.insecureurl.com/request',
        },
      },
    ];
    issues.mixedContentIssue.push(...mixedContentIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: 'Mixed content',
      subItems: {
        type: 'subitems',
        items: [
          {
            // Fell back to `mainResourceURL` since no `request`.
            url: 'www.mixedcontent.com',
          },
          {
            url: 'www.insecureurl.com/request',
          },
        ],
      },
    });
  });

  it('correctly displays cookie issues', () => {
    const cookieIssues = [
      {
        cookieUrl: 'www.samesitecookies.com',
      },
      {
        request: {
          requestId: '2',
          url: 'www.samesiterequest.com',
        },
      },
    ];
    issues.cookieIssue.push(...cookieIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: 'Cookie',
      subItems: {
        type: 'subitems',
        items: [
          {
            // Fell back to `mainResourceURL` since no `request`.
            url: 'www.samesitecookies.com',
          },
          {
            url: 'www.samesiterequest.com',
          },
        ],
      },
    });
  });

  it('correctly displays Blocked By Response issues', () => {
    const blockedByResponseIssues = [
      {
        reason: 'CoepFrameResourceNeedsCoepHeader',
        request: {
          url: 'www.coep.com',
        },
      },
      {
        reason: 'CoopSandboxedIFrameCannotNavigateToCoopPage',
        request: {
          url: 'www.coop.com',
        },
      },
      {
        reason: 'CorpNotSameOriginAfterDefaultedToSameOriginByCoep',
        request: {
          requestId: '3',
        },
      },
      {
        reason: 'CorpNotSameOrigin',
        request: {
          url: 'www.same-origin.com',
        },
      },
      {
        reason: 'CorpNotSameSite',
        request: {
          url: 'www.same-site.com',
        },
      },
    ];
    issues.blockedByResponseIssue.push(...blockedByResponseIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Blocked by cross-origin policy',
      },
      subItems: {
        type: 'subitems',
        // should only be 4 subitems as one of the issues doesn't have a request url
        items: [
          {
            url: 'www.coep.com',
          },
          {
            url: 'www.coop.com',
          },
          {
            url: 'www.same-origin.com',
          },
          {
            url: 'www.same-site.com',
          },
        ],
      },
    });
  });

  it('correctly displays Heavy Ads issues', () => {
    const heavyAdsIssues = [
      {
        resolution: 'HeavyAdBlocked',
        reason: 'NetworkTotalLimit',
      },
      {
        resolution: 'HeavyAdBlocked',
        reason: 'CpuTotalLimit',
      },
      {
        resolution: 'HeavyAdBlocked',
        reason: 'CpuPeakLimit',
      },
    ];
    issues.heavyAdIssue.push(...heavyAdsIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Heavy resource usage by ads',
      },
    });
  });

  it('correctly displays Content Security Policy issues', () => {
    const cspIssues = [
      {
        contentSecurityPolicyViolationType: 'kInlineViolation',
        blockedURL: 'www.csp.com/inline-violation',
      },
      {
        contentSecurityPolicyViolationType: 'kEvalViolation',
        blockedURL: 'www.csp.com/eval-violation',
      },
      {
        contentSecurityPolicyViolationType: 'kURLViolation',
        blockedURL: 'www.csp.com/url-violation',
      },
      // These last two should be filtered out as they aren't supported yet
      {
        contentSecurityPolicyViolationType: 'kTrustedTypesSinkViolation',
        blockedURL: 'www.csp.com/sink-violation',
      },
      {
        contentSecurityPolicyViolationType: 'kTrustedTypesPolicyViolation',
        blockedURL: 'www.csp.com/policy-violation',
      },
    ];
    issues.contentSecurityPolicyIssue.push(...cspIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: 'Content security policy',
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'www.csp.com/inline-violation',
          },
          {
            url: 'www.csp.com/eval-violation',
          },
          {
            url: 'www.csp.com/url-violation',
          },
        ],
      },
    });
  });

  it('correctly displays Attribution Reporting issues', () => {
    const attributionReportingIssues = [
      {
        violationType: 'PermissionPolicyDisabled',
        request: {
          url: 'www.attribution.com',
        },
      },
      {
        violationType: 'InvalidAttributionSourceIdEvent',
      },
    ];
    issues.attributionReportingIssue.push(...attributionReportingIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Attribution reporting',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'www.attribution.com',
          },
        ],
      },
    });
  });

  it('correctly displays Client Hint Issues', () => {
    const clientHintIssues = [
      {
        sourceCodeLocation: {
          url: 'www.client.com/file.html',
          lineNumber: 1,
          columnNumber: 1,
        },
        clientHintIssueReason: 'MetaTagAllowListInvalidOrigin',
      },
    ];
    issues.clientHintIssue.push(...clientHintIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Client hint incorrectly used',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'www.client.com/file.html, line 1',
          },
        ],
      },
    });
  });

  it('correctly displays CORS Issues', () => {
    const corsIssues = [
      {
        corsErrorStatus: {
          corsError: 'DisallowedByMode',
          failedParameter: 'something',
        },
        request: {
          url: 'www.cors.com',
        },
      },
      {
        corsErrorStatus: {
          corsError: 'InvalidResponse',
          failedParameter: 'everything',
        },
      },
    ];
    issues.corsIssue.push(...corsIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'CORS Problems',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'www.cors.com',
          },
        ],
      },
    });
  });

  it('correctly displays Deprecation issues', () => {
    const deprecationIssues = [
      {
        type: 'CookieWithTruncatingChar',
        sourceCodeLocation: {
          url: 'www.deprecated.com',
          lineNumber: 1,
          columnNumber: 1,
        },
      },
    ];
    issues.deprecationIssue.push(...deprecationIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Deprecated feature used',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'www.deprecated.com, line 1',
          },
        ],
      },
    });
  });

  it('correctly displays Federated Auth Request issues', () => {
    const federatedAuthReqIssues = [
      {federatedAuthRequestIssueReason: 'MetaTagAllowListInvalidOrigin'},
    ];
    issues.federatedAuthRequestIssue.push(...federatedAuthReqIssues);

    const auditResult = InspectorIssuesAudit.audit({
      URL: {
        finalUrl: 'https://federated.com',
      },
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Failed federated authentication request',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'https://federated.com',
          },
        ],
      },
    });
  });

  it('correctly displays Generic issues', () => {
    const genericIssues = [
      {errorType: 'CrossOriginPortalPostMessageError'},
    ];
    issues.genericIssue.push(...genericIssues);

    const auditResult = InspectorIssuesAudit.audit({
      URL: {
        finalUrl: 'https://generic.com',
      },
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Generic issue on the front end',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'https://generic.com',
          },
        ],
      },
    });
  });

  it('correctly displays Low Text Contrast issues', () => {
    const lowTextContrastIssues = [
      {
        violatingNodeSelector: 'p',
      },
    ];
    issues.lowTextContrastIssue.push(...lowTextContrastIssues);

    const auditResult = InspectorIssuesAudit.audit({
      URL: {
        finalUrl: 'nocontrast.com',
      },
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Low text contrast',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'nocontrast.com - p',
          },
        ],
      },
    });
  });

  it('correctly displays Navigator User Agent issues', () => {
    const navigatorUserAgentIssues = [
      {
        url: 'navuseragent.com',
        location: {
          url: 'navuseragent.com',
          lineNumber: 1,
          columnNumber: 1,
        },
      },
      {
        url: 'navuseragent2.com',
      },
    ];
    issues.navigatorUserAgentIssue.push(...navigatorUserAgentIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Using information not present in reduced user-agent strings',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'navuseragent.com, line 1',
          },
          {
            url: 'navuseragent2.com',
          },
        ],
      },
    });
  });

  it('correctly displays Quirks Mode issues', () => {
    const quirksModeIssues = [
      {
        url: 'quirky.com',
      },
    ];
    issues.quirksModeIssue.push(...quirksModeIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Document renders in quirks mode',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'quirky.com',
          },
        ],
      },
    });
  });

  it('correctly displays Shared Array Buffer issues', () => {
    const sharedArrayBufferIssues = [
      {
        type: 'CreationIssue',
        sourceCodeLocation: {
          url: 'badbuffer.com',
          lineNumber: 1,
          columnNumber: 1,
        },
      },
    ];
    issues.sharedArrayBufferIssue.push(...sharedArrayBufferIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Shared Array Buffer not cross-origin isolated',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'badbuffer.com, line 1',
          },
        ],
      },
    });
  });

  it('correctly displays TWA Quality Enforcement issues', () => {
    const twaQualityEnforcementIssues = [
      {
        url: 'badtwa.com',
      },
    ];
    issues.twaQualityEnforcement.push(...twaQualityEnforcementIssues);

    const auditResult = InspectorIssuesAudit.audit({
      InspectorIssues: issues,
    });
    expect(auditResult.score).toBe(0);
    expect(auditResult.details.items[0]).toMatchObject({
      issueType: {
        formattedDefault: 'Some TWA requirements not met',
      },
      subItems: {
        type: 'subitems',
        items: [
          {
            url: 'badtwa.com',
          },
        ],
      },
    });
  });
});
