/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import InspectorIssues from '../../../gather/gatherers/inspector-issues.js';
import {createMockContext} from '../mock-driver.js';
import {flushAllTimersAndMicrotasks, timers} from '../../test-utils.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

/**
 * @param {Partial<LH.Artifacts.NetworkRequest>=} partial
 * @return {Partial<LH.Artifacts.NetworkRequest>}
 */
function mockRequest(partial) {
  return {
    url: 'https://example.com',
    documentURL: 'https://example.com',
    finished: true,
    frameId: 'frameId',
    isSecure: true,
    isValid: true,
    parsedURL: {scheme: 'https', host: 'example.com', securityOrigin: 'https://example.com'},
    protocol: 'http/1.1',
    requestMethod: 'GET',
    resourceType: 'Document',
    ...partial,
  };
}

/**
 * @param {Partial<LH.Crdp.Audits.MixedContentIssueDetails>=} details
 * @return {LH.Crdp.Audits.InspectorIssue} partial
 */
function mockMixedContent(details) {
  return {
    code: 'MixedContentIssue',
    details: {
      mixedContentIssueDetails: {
        resolutionStatus: 'MixedContentBlocked',
        insecureURL: 'https://example.com',
        mainResourceURL: 'https://example.com',
        ...details,
      },
    },
  };
}

/**
 * @param {Partial<LH.Crdp.Audits.CookieIssueDetails>=} details
 * @return {LH.Crdp.Audits.InspectorIssue} partial
 */
function mockCookie(details) {
  return {
    code: 'CookieIssue',
    details: {
      cookieIssueDetails: {
        cookie: {
          name: 'name',
          path: 'path',
          domain: 'domain',
        },
        cookieWarningReasons: [],
        cookieExclusionReasons: [],
        operation: 'ReadCookie',
        ...details,
      },
    },
  };
}

/**
 * @param {Partial<LH.Crdp.Audits.BlockedByResponseIssueDetails>=} details
 * @return {LH.Crdp.Audits.InspectorIssue} partial
 */
function mockBlockedByResponse(details) {
  return {
    code: 'BlockedByResponseIssue',
    details: {
      blockedByResponseIssueDetails: {
        request: {requestId: '1', url: 'https://example.com/1'},
        reason: 'CorpNotSameOrigin',
        ...details,
      },
    },
  };
}

/**
 * @param {Partial<LH.Crdp.Audits.HeavyAdIssueDetails>=} details
 * @return {LH.Crdp.Audits.InspectorIssue} partial
 */
function mockHeavyAd(details) {
  return {
    code: 'HeavyAdIssue',
    details: {
      heavyAdIssueDetails: {
        resolution: 'HeavyAdBlocked',
        reason: 'CpuPeakLimit',
        frame: {
          frameId: 'frameId',
        },
        ...details,
      },
    },
  };
}

/**
 * @param {Partial<LH.Crdp.Audits.ContentSecurityPolicyIssueDetails>=} details
 * @return {LH.Crdp.Audits.InspectorIssue} partial
 */
function mockCSP(details) {
  return {
    code: 'ContentSecurityPolicyIssue',
    details: {
      contentSecurityPolicyIssueDetails: {
        violatedDirective: 'default-drc',
        isReportOnly: false,
        contentSecurityPolicyViolationType: 'kInlineViolation',
        ...details,
      },
    },
  };
}

/**
 * @param {string} type
 * @return {LH.Crdp.Audits.InspectorIssue}
 */
function mockDeprecation(type) {
  return {
    code: 'DeprecationIssue',
    details: {
      deprecationIssueDetails: {
        type,
        sourceCodeLocation: {
          url: 'https://www.example.com',
          lineNumber: 10,
          columnNumber: 10,
        },
      },
    },
  };
}

describe('instrumentation', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  it('collects inspector issues', async () => {
    const mockContext = createMockContext();
    const mockMixedContentIssue = mockMixedContent({resourceType: 'Audio'});
    const mockCookieIssue =
      mockCookie({cookieWarningReasons: ['WarnSameSiteNoneInsecure']});
    mockContext.driver.defaultSession.on
      .mockEvent('Audits.issueAdded', {issue: mockMixedContentIssue})
      .mockEvent('Audits.issueAdded', {issue: mockCookieIssue});
    mockContext.driver.defaultSession.sendCommand
      .mockResponse('Audits.enable')
      .mockResponse('Audits.disable');
    const gatherer = new InspectorIssues();

    await gatherer.startInstrumentation(mockContext.asContext());
    await flushAllTimersAndMicrotasks();
    await gatherer.stopInstrumentation(mockContext.asContext());

    expect(gatherer._issues).toEqual([
      mockMixedContentIssue,
      mockCookieIssue,
    ]);
  });
});

describe('getArtifact', () => {
  it('handles multiple types of inspector issues', async () => {
    const gatherer = new InspectorIssues();
    gatherer._issues = [
      mockMixedContent({request: {requestId: '1', url: 'https://example.com/1'}}),
      mockCookie({request: {requestId: '2', url: 'https://example.com/2'}}),
      mockBlockedByResponse({request: {requestId: '3', url: 'https://example.com/3'}}),
      mockHeavyAd(),
      mockCSP(),
      mockDeprecation('AuthorizationCoveredByWildcard'),
    ];
    const devtoolsLog = networkRecordsToDevtoolsLog([
      mockRequest({requestId: '1'}),
      mockRequest({requestId: '2'}),
      mockRequest({requestId: '3'}),
    ]);
    const mockContext = createMockContext();
    const context = {
      ...mockContext.asContext(),
      dependencies: {DevtoolsLog: devtoolsLog},
    };

    const artifact = await gatherer.getArtifact(context);

    expect(artifact).toEqual({
      mixedContentIssue: [{
        request: {requestId: '1', url: 'https://example.com/1'},
        resolutionStatus: 'MixedContentBlocked',
        insecureURL: 'https://example.com',
        mainResourceURL: 'https://example.com',
      }],
      cookieIssue: [{
        request: {requestId: '2', url: 'https://example.com/2'},
        cookie: {
          name: 'name',
          path: 'path',
          domain: 'domain',
        },
        cookieWarningReasons: [],
        cookieExclusionReasons: [],
        operation: 'ReadCookie',
      }],
      bounceTrackingIssue: [],
      blockedByResponseIssue: [{
        request: {requestId: '3', url: 'https://example.com/3'},
        reason: 'CorpNotSameOrigin',
      }],
      heavyAdIssue: [{
        resolution: 'HeavyAdBlocked',
        reason: 'CpuPeakLimit',
        frame: {
          frameId: 'frameId',
        },
      }],
      contentSecurityPolicyIssue: [{
        violatedDirective: 'default-drc',
        isReportOnly: false,
        contentSecurityPolicyViolationType: 'kInlineViolation',
      }],
      cookieDeprecationMetadataIssue: [],
      deprecationIssue: [{
        type: 'AuthorizationCoveredByWildcard',
        sourceCodeLocation: {
          url: 'https://www.example.com',
          columnNumber: 10,
          lineNumber: 10,
        },
      }],
      attributionReportingIssue: [],
      clientHintIssue: [],
      corsIssue: [],
      genericIssue: [],
      lowTextContrastIssue: [],
      navigatorUserAgentIssue: [],
      propertyRuleIssue: [],
      quirksModeIssue: [],
      selectElementAccessibilityIssue: [],
      sharedArrayBufferIssue: [],
      sharedDictionaryIssue: [],
      federatedAuthRequestIssue: [],
      stylesheetLoadingIssue: [],
      federatedAuthUserInfoRequestIssue: [],
    });
  });

  it('dedupe by request id', async () => {
    const gatherer = new InspectorIssues();
    gatherer._issues = [
      mockMixedContent({request: {requestId: '1', url: 'https://example.com/1'}}),
      mockMixedContent({request: {requestId: '2', url: 'https://example.com/2'}}),
      mockCookie({request: {requestId: '3', url: 'https://example.com/3'}}),
      mockCookie({request: {requestId: '4', url: 'https://example.com/4'}}),
      mockBlockedByResponse({request: {requestId: '5', url: 'https://example.com/5'}}),
      mockBlockedByResponse({request: {requestId: '6', url: 'https://example.com/6'}}),
    ];
    const devtoolsLog = networkRecordsToDevtoolsLog([
      mockRequest({requestId: '1'}),
      mockRequest({requestId: '3'}),
      mockRequest({requestId: '5'}),
    ]);
    const mockContext = createMockContext();
    const context = {
      ...mockContext.asContext(),
      dependencies: {DevtoolsLog: devtoolsLog},
    };

    const artifact = await gatherer.getArtifact(context);

    expect(artifact).toEqual({
      mixedContentIssue: [{
        request: {requestId: '1', url: 'https://example.com/1'},
        resolutionStatus: 'MixedContentBlocked',
        insecureURL: 'https://example.com',
        mainResourceURL: 'https://example.com',
      }],
      cookieIssue: [{
        request: {requestId: '3', url: 'https://example.com/3'},
        cookie: {
          name: 'name',
          path: 'path',
          domain: 'domain',
        },
        cookieWarningReasons: [],
        cookieExclusionReasons: [],
        operation: 'ReadCookie',
      }],
      bounceTrackingIssue: [],
      blockedByResponseIssue: [{
        request: {requestId: '5', url: 'https://example.com/5'},
        reason: 'CorpNotSameOrigin',
      }],
      heavyAdIssue: [],
      clientHintIssue: [],
      contentSecurityPolicyIssue: [],
      cookieDeprecationMetadataIssue: [],
      deprecationIssue: [],
      attributionReportingIssue: [],
      corsIssue: [],
      genericIssue: [],
      lowTextContrastIssue: [],
      navigatorUserAgentIssue: [],
      propertyRuleIssue: [],
      quirksModeIssue: [],
      selectElementAccessibilityIssue: [],
      sharedArrayBufferIssue: [],
      sharedDictionaryIssue: [],
      federatedAuthRequestIssue: [],
      stylesheetLoadingIssue: [],
      federatedAuthUserInfoRequestIssue: [],
    });
  });
});
