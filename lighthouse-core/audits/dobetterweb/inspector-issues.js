/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to determine whether it generates issues in the Issues panel of Chrome Devtools.
 * The audit is meant to maintain parity with the Chrome Devtools Issues panel front end.
 * https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/sdk/
 */

'use strict';

/** @typedef {{url: string}} IssueSubItem */
/** @typedef {{issueType: string|LH.IcuMessage, subItems: Array<IssueSubItem>}} IssueItem */

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

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
  /** The type of an Issue in Chrome DevTools when a resource is blocked due to the website's cross-origin policy. */
  issueTypeBlockedByResponse: 'Blocked by cross-origin policy',
  /** The type of an Issue in Chrome DevTools when a site has large ads that use up a lot of the browser's resources. */
  issueTypeHeavyAds: 'Heavy resource usage by ads',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      const requestUrl = (issue.request && issue.request.url) || issue.mainResourceURL;
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
   * @param {Array<LH.Crdp.Audits.SameSiteCookieIssueDetails>} sameSiteCookieIssues
   * @return {LH.Audit.Details.TableItem}
   */
  static getSameSiteCookieRow(sameSiteCookieIssues) {
    const requestUrls = new Set();
    for (const issue of sameSiteCookieIssues) {
      const requestUrl = (issue.request && issue.request.url) || issue.cookieUrl;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: 'SameSite cookie',
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => {
          return {
            url,
          };
        }),
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
      const requestUrl = issue.request && issue.request.url;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: str_(UIStrings.issueTypeBlockedByResponse),
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => {
          return {
            url,
          };
        }),
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
      const requestUrl = issue.blockedURL;
      if (requestUrl) {
        requestUrls.add(requestUrl);
      }
    }
    return {
      issueType: 'Content security policy',
      subItems: {
        type: 'subitems',
        items: Array.from(requestUrls).map(url => {
          return {
            url,
          };
        }),
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
      {key: 'issueType', itemType: 'text', subItemsHeading: {key: 'url', itemType: 'url'}, text: str_(UIStrings.columnIssueType)},
      /* eslint-enable max-len */
    ];

    const issues = artifacts.InspectorIssues;
    /** @type LH.Audit.Details.TableItem[] */
    const items = [];

    if (issues.mixedContent.length) {
      items.push(this.getMixedContentRow(issues.mixedContent));
    }
    if (issues.sameSiteCookies.length) {
      items.push(this.getSameSiteCookieRow(issues.sameSiteCookies));
    }
    if (issues.blockedByResponse.length) {
      items.push(this.getBlockedByResponseRow(issues.blockedByResponse));
    }
    if (issues.heavyAds.length) {
      items.push({issueType: str_(UIStrings.issueTypeHeavyAds)});
    }
    const cspIssues = issues.contentSecurityPolicy.filter(issue => {
      // kTrustedTypesSinkViolation and kTrustedTypesPolicyViolation aren't currently supported by the Issues panel
      return (
        issue.contentSecurityPolicyViolationType !== 'kTrustedTypesSinkViolation' &&
        issue.contentSecurityPolicyViolationType !== 'kTrustedTypesPolicyViolation' &&
        // filter csp issue from tap-targets gatherer
        !(
          issue.blockedURL === undefined &&
          issue.violatedDirective === 'style-src-elem' &&
          issue.contentSecurityPolicyViolationType === 'kInlineViolation'
        )
      );
    });
    if (cspIssues.length) {
      items.push(this.getContentSecurityPolicyRow(cspIssues));
    }
    return {
      score: items.length > 0 ? 0 : 1,
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

module.exports = IssuesPanelEntries;
module.exports.UIStrings = UIStrings;
