/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to determine whether it generates issues in the Issues panel of Chrome Devtools.
 * The audit is meant to maintain parity with the Chrome Devtools Issues panel front end.
 * https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/sdk/
 */


/** @typedef {{url: string}} IssueSubItem */
/** @typedef {{issueType: string|LH.IcuMessage, subItems: Array<IssueSubItem>}} IssueItem */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on various types of problems with a website, like security or network errors. This descriptive title is shown to users when no issues were logged into the Chrome DevTools Issues panel. */
  title: 'No issues in the `Issues` panel in Chrome Devtools',
  /** Title of a Lighthouse audit that provides detail on various types of problems with a website, like security or network errors. This descriptive title is shown to users when issues are detected and logged into the Chrome DevTools Issues panel. */
  failureTitle: 'Issues were logged in the `Issues` panel in Chrome Devtools',
  /* eslint-disable max-len */
  /** Description of a Lighthouse audit that tells the user why issues being logged to the Chrome DevTools Issues panel are a cause for concern and so should be fixed. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'Issues logged to the `Issues` panel in Chrome Devtools indicate unresolved problems. They can come from network request failures, insufficient security controls, and other browser concerns. Open up the Issues panel in Chrome DevTools for more details on each issue.',
  /* eslint-enable max-len */
  /** Table column header for the types of problems observed in a website, like security or network errors. */
  columnIssueType: 'Issue type',
  /** Issue when a resource is blocked due to the website's cross-origin policy. */
  issueTypeBlockedByResponse: 'Blocked by cross-origin policy',
  /** Issue when a site has large ads that use up a lot of the browser's resources. */
  issueTypeHeavyAds: 'Heavy resource usage by ads',
  /** Issue around "Attribution Reporting API" usage. */
  issueTypeAttributionReporting: 'Attribution reporting',
  /** Issue when a client hint is incorrectly used. */
  issueTypeClientHint: 'Client hint incorrectly used',
  /** Issue related to CORS. */
  issueTypeCors: 'CORS Problems',
  /** Issue when a deprecated feature is used. */
  issueTypeDeprecated: 'Deprecated feature used',
  /** Issue when federated authentication request fails. */
  issueTypeFederatedAuthRequest: 'Failed federated authentication request',
  /** The type of an issue in Chrome DevTools when some generic problem happens. */
  issueTypeGeneric: 'Generic issue on the front end',
  /** Issue when the text doesn't have enough contrast. */
  issueTypeLowTextContrast: 'Low text contrast',
  /** Issue related to the reduction of information in user-agent strings. */
  issueTypeNavigatorUserAgent: 'Using information not present in reduced user-agent strings',
  /** Issue related to the document rendering in quirks mode. */
  issueTypeQuirksMode: 'Document renders in quirks mode',
  /** Issue related to a shared array buffer not being used in context a that is cross-origin isolated. */
  issueTypeSharedArrayBuffer: 'Shared Array Buffer not cross-origin isolated',
  /** Issue related to not meeting the requirements as a TWA. */
  issueTypeTwaQualityEnforcement: 'Some TWA requirements not met',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class IssuesPanelEntries extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'inspector-issues',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['InspectorIssues'],
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.MixedContentIssueDetails>} mixedContentIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getMixedContentRow(mixedContentIssues) {
    const requestUrls = new Set();
    for (const issue of mixedContentIssues) {
      const requestUrl = issue.request?.url || issue.mainResourceURL;
      requestUrls.add(requestUrl);
    }
    return {
      issueType: 'Mixed content',
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.CookieIssueDetails>} CookieIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getCookieRow(CookieIssues) {
    const requestUrls = new Set();
    for (const issue of CookieIssues) {
      const requestUrl = (issue.request?.url) || issue.cookieUrl;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: 'Cookie',
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.BlockedByResponseIssueDetails>} blockedByResponseIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getBlockedByResponseRow(blockedByResponseIssues) {
    const requestUrls = new Set();
    for (const issue of blockedByResponseIssues) {
      const requestUrl = issue.request?.url;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: str_(UIStrings.issueTypeBlockedByResponse),
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.ContentSecurityPolicyIssueDetails>} cspIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getContentSecurityPolicyRow(cspIssues) {
    const requestUrls = new Set();
    for (const issue of cspIssues) {
      const requestUrl = issue?.blockedURL;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: 'Content security policy',
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.AttributionReportingIssueDetails>} attributionReportingIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getAttributionReportingRow(attributionReportingIssues) {
    const requestUrls = new Set();
    for (const issue of attributionReportingIssues) {
      const requestUrl = issue.request?.url;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: str_(UIStrings.issueTypeAttributionReporting),
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.ClientHintIssueDetails>} clientHintIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getClientHintRow(clientHintIssues) {
    const urls = new Set();
    for (const issue of clientHintIssues) {
      const url = issue.sourceCodeLocation.url;
      const lineNumber = issue.sourceCodeLocation.lineNumber;
      urls.add(`${url}, line ${lineNumber}`);
    }
    return {
      issueType: str_(UIStrings.issueTypeClientHint),
      subItems: {
        type: 'subitems',
        items: Array.from(urls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.CorsIssueDetails>} corsIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getCorsRow(corsIssues) {
    const requestUrls = new Set();
    for (const issue of corsIssues) {
      const requestUrl = issue.request?.url;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: str_(UIStrings.issueTypeCors),
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.DeprecationIssueDetails>} deprecationIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getDeprecationRow(deprecationIssues) {
    const urls = new Set();
    for (const issue of deprecationIssues) {
      const url = issue.sourceCodeLocation.url;
      const lineNumber = issue.sourceCodeLocation.lineNumber;
      urls.add(`${url}, line ${lineNumber}`);
    }
    return {
      issueType: str_(UIStrings.issueTypeDeprecated),
      subItems: {
        type: 'subitems',
        items: Array.from(urls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.FederatedAuthRequestIssueDetails>} _federatedAuthReqIssues
   * @param {string} url The url of the current page.
   * @return {LH.Audit.Details.TableItem}
   */
  static getFederatedAuthRequestRow(_federatedAuthReqIssues, url) {
    return {
      issueType: str_(UIStrings.issueTypeFederatedAuthRequest),
      subItems: {
        type: 'subitems',
        items: [{url: url}],
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.GenericIssueDetails>} _genericIssues
   * @param {string} url The url of the current page.
   * @return {LH.Audit.Details.TableItem}
   */
  static getGenericRow(_genericIssues, url) {
    return {
      issueType: str_(UIStrings.issueTypeGeneric),
      subItems: {
        type: 'subitems',
        items: [{url: url}],
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.LowTextContrastIssueDetails>} lowTextContrastIssues
   * @param {string} url The url of the current page.
   * @return {LH.Audit.Details.TableItem}
   */
  static getLowTextContrastRow(lowTextContrastIssues, url) {
    const urls = new Set();
    for (const issue of lowTextContrastIssues) {
      urls.add(`${url} - ${issue.violatingNodeSelector}`);
    }
    return {
      issueType: str_(UIStrings.issueTypeLowTextContrast),
      subItems: {
        type: 'subitems',
        items: Array.from(urls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.NavigatorUserAgentIssueDetails>} navigatorUserAgentIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getNavigatorUserAgentRow(navigatorUserAgentIssues) {
    const urls = new Set();
    for (const issue of navigatorUserAgentIssues) {
      const url = issue.url;
      const lineNumber = issue.location?.lineNumber;
      urls.add(`${url}${lineNumber ? `, line ${lineNumber}` : ''}`);
    }
    return {
      issueType: str_(UIStrings.issueTypeNavigatorUserAgent),
      subItems: {
        type: 'subitems',
        items: Array.from(urls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.QuirksModeIssueDetails>} quirksModeIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getQuirksModeRow(quirksModeIssues) {
    const urls = new Set();
    for (const issue of quirksModeIssues) {
      urls.add(issue.url);
    }
    return {
      issueType: str_(UIStrings.issueTypeQuirksMode),
      subItems: {
        type: 'subitems',
        items: Array.from(urls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.SharedArrayBufferIssueDetails>} sharedArrayBufferIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getSharedArrayBufferRow(sharedArrayBufferIssues) {
    const urls = new Set();
    for (const issue of sharedArrayBufferIssues) {
      const url = issue.sourceCodeLocation.url;
      const lineNumber = issue.sourceCodeLocation.lineNumber;
      urls.add(`${url}, line ${lineNumber}`);
    }
    return {
      issueType: str_(UIStrings.issueTypeSharedArrayBuffer),
      subItems: {
        type: 'subitems',
        items: Array.from(urls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {Array<LH.Crdp.Audits.TrustedWebActivityIssueDetails>} twaQualityEnforcementIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getTwaQualityEnforcementRow(twaQualityEnforcementIssues) {
    const urls = new Set();
    for (const issue of twaQualityEnforcementIssues) {
      urls.add(issue.url);
    }
    return {
      issueType: str_(UIStrings.issueTypeTwaQualityEnforcement),
      subItems: {
        type: 'subitems',
        items: Array.from(urls).map(url => ({url})),
      },
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'issueType', valueType: 'text', subItemsHeading: {key: 'url', valueType: 'url'}, label: str_(UIStrings.columnIssueType)},
      /* eslint-enable max-len */
    ];

    const issues = artifacts.InspectorIssues;
    /** @type LH.Audit.Details.TableItem[] */
    const items = [];

    if (issues.mixedContentIssue.length) {
      items.push(this.getMixedContentRow(issues.mixedContentIssue));
    }
    if (issues.cookieIssue.length) {
      items.push(this.getCookieRow(issues.cookieIssue));
    }
    if (issues.blockedByResponseIssue.length) {
      items.push(this.getBlockedByResponseRow(issues.blockedByResponseIssue));
    }
    if (issues.heavyAdIssue.length) {
      items.push({issueType: str_(UIStrings.issueTypeHeavyAds)});
    }
    const cspIssues = issues.contentSecurityPolicyIssue.filter(issue => {
      // kTrustedTypesSinkViolation and kTrustedTypesPolicyViolation aren't currently supported by the Issues panel
      return issue.contentSecurityPolicyViolationType !== 'kTrustedTypesSinkViolation' &&
        issue.contentSecurityPolicyViolationType !== 'kTrustedTypesPolicyViolation';
    });
    if (cspIssues.length) {
      items.push(this.getContentSecurityPolicyRow(cspIssues));
    }
    if (issues.attributionReportingIssue.length) {
      items.push(this.getAttributionReportingRow(issues.attributionReportingIssue));
    }
    if (issues.clientHintIssue.length) {
      items.push(this.getClientHintRow(issues.clientHintIssue));
    }
    if (issues.corsIssue.length) {
      items.push(this.getCorsRow(issues.corsIssue));
    }
    if (issues.deprecationIssue.length) {
      items.push(this.getDeprecationRow(issues.deprecationIssue));
    }
    if (issues.federatedAuthRequestIssue.length) {
      items.push(this.getFederatedAuthRequestRow(issues.federatedAuthRequestIssue,
        artifacts.URL.finalUrl));
    }
    if (issues.genericIssue.length) {
      items.push(this.getGenericRow(issues.genericIssue, artifacts.URL.finalUrl));
    }
    if (issues.lowTextContrastIssue.length) {
      items.push(this.getLowTextContrastRow(issues.lowTextContrastIssue, artifacts.URL.finalUrl));
    }
    if (issues.navigatorUserAgentIssue.length) {
      items.push(this.getNavigatorUserAgentRow(issues.navigatorUserAgentIssue));
    }
    if (issues.quirksModeIssue.length) {
      items.push(this.getQuirksModeRow(issues.quirksModeIssue));
    }
    if (issues.sharedArrayBufferIssue.length) {
      items.push(this.getSharedArrayBufferRow(issues.sharedArrayBufferIssue));
    }
    if (issues.twaQualityEnforcement.length) {
      items.push(this.getTwaQualityEnforcementRow(issues.twaQualityEnforcement));
    }
    return {
      score: items.length > 0 ? 0 : 1,
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

export default IssuesPanelEntries;
export {UIStrings};
