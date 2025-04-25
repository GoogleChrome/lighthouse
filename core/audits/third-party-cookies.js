/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to determine if it is using third party cookies.
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';

/* eslint-disable max-len */
const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the use of third party cookies. This descriptive title is shown to users when the page does not use third party cookies. */
  title: 'Avoids third-party cookies',
  /** Title of a Lighthouse audit that provides detail on the use of third party cookies. This descriptive title is shown to users when the page uses third party cookies. */
  failureTitle: 'Uses third-party cookies',
  /** Description of a Lighthouse audit that tells the user why they should not use third party cookies on their page. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Third-party cookies may be blocked in some contexts. [Learn more about preparing for third-party cookie restrictions](https://privacysandbox.google.com/cookies/prepare/overview).',
  /** [ICU Syntax] Label for the audit identifying the number of third-party cookies. */
  displayValue: `{itemCount, plural,
    =1 {1 cookie found}
    other {# cookies found}
    }`,
};
/* eslint-enable max-len */

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ThirdPartyCookies extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'third-party-cookies',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['InspectorIssues'],
    };
  }

  /**
   * https://source.chromium.org/chromium/chromium/src/+/d2fcd4ba302baeabf4b96d8fa9fdb7a215736c31:third_party/devtools-frontend/src/front_end/models/issues_manager/CookieIssue.ts;l=62-69
   * @param {LH.Crdp.Audits.CookieIssueDetails} cookieIssue
   * @return {string}
   */
  static getCookieId(cookieIssue) {
    if (!cookieIssue.cookie) {
      return cookieIssue.rawCookieLine ?? 'no-cookie-info';
    }

    const {domain, path, name} = cookieIssue.cookie;
    const cookieId = `${domain};${path};${name}`;
    return cookieId;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    /** @type {Set<string>} */
    const seenCookies = new Set();

    /** @type {LH.Audit.Details.TableItem[]} */
    const items = [];
    for (const issue of artifacts.InspectorIssues.cookieIssue) {
      const isPhaseoutWarn = issue.cookieWarningReasons.includes('WarnThirdPartyPhaseout');
      const isPhaseoutExclude = issue.cookieExclusionReasons.includes('ExcludeThirdPartyPhaseout');
      if (!isPhaseoutWarn && !isPhaseoutExclude) continue;

      // According to JSDOC for `issue.cookie`, if `cookie` is undefined then `rawCookieLine`
      // should be set and no valid cookie could be created. It should be safe to skip in this case.
      const name = issue.cookie?.name || issue.rawCookieLine;
      if (!name) continue;

      const cookieId = this.getCookieId(issue);
      if (seenCookies.has(cookieId)) continue;
      seenCookies.add(cookieId);

      items.push({
        name,
        url: issue.cookieUrl,
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'name', valueType: 'text', label: str_(i18n.UIStrings.columnName)},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
    ];
    const details = Audit.makeTableDetails(headings, items);

    let displayValue;
    if (items.length > 0) {
      displayValue = str_(UIStrings.displayValue, {itemCount: items.length});
    }

    return {
      score: items.length ? 0 : 1,
      displayValue,
      details,
    };
  }
}

export default ThirdPartyCookies;
export {UIStrings};
