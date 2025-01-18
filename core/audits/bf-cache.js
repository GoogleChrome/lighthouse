/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NotRestoredReasonDescription} from '../lib/bf-cache-strings.js';

/* eslint-disable max-len */
const UIStrings = {
  /** Title of a diagnostic Lighthouse audit that identifies when the back/forward cache is being used. "back/forward" refers to the back and forward buttons found in modern browsers. This title is shown to users if the back/forward cache was used, or if the there was no attempt to restore the page from the back/forward cache. */
  title: `Page didn't prevent back/forward cache restoration`,
  /** Title of a diagnostic Lighthouse audit that identifies when the back/forward cache is being used. "back/forward" refers to the back and forward buttons found in modern browsers. This title is shown to users if the page attempted to restore from the back/forward cache but the back/forward cache was not used. */
  failureTitle: 'Page prevented back/forward cache restoration',
  /** Description of a diagnostic Lighthouse audit that identifies when the back/forward cache is being used. "back/forward" refers to the back and forward buttons found in modern browsers. */
  description: 'Many navigations are performed by going back to a previous page, or forwards again. The back/forward cache (bfcache) can speed up these return navigations. [Learn more about the bfcache](https://developer.chrome.com/docs/lighthouse/performance/bf-cache/)',
  /** Failure type for an error that the user should be able to address themselves. Shown in a table column with other failure types. */
  actionableFailureType: 'Actionable',
  /** Failure type for an error that the user cannot address in the page's code. Shown in a table column with other failure types. */
  notActionableFailureType: 'Not actionable',
  /** Failure type for an error caused by missing browser support. Shown in a table column with other failure types. */
  supportPendingFailureType: 'Pending browser support',
  /** Label for a column in a data table; entries in the column will be a string explaining why a failure occurred. */
  failureReasonColumn: 'Failure reason',
  /** Label for a column in a data table; entries in the column will be a string representing the type of failure preventing the back/forward cache from being used. */
  failureTypeColumn: 'Failure type',
  /** Warning explaining that the back/forward cache results cannot be shown in the old Headless Chrome. "back/forward" refers to the back and forward buttons found in modern browsers. "Headless Chrome" is a product name and should not be translated. */
  warningHeadless: 'Back/forward cache cannot be tested in old Headless Chrome (`--chrome-flags="--headless=old"`). To see audit results, use the new Headless Chrome (`--chrome-flags="--headless=new"`) or standard Chrome.',
  /**
   * @description [ICU Syntax] Label for an audit identifying the number of back/forward cache failure reasons found in the page.
   */
  displayValue: `{itemCount, plural,
    =1 {1 failure reason}
    other {# failure reasons}
    }`,
};
/* eslint-enable max-len */

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {LH.Crdp.Page.BackForwardCacheNotRestoredReasonType[]} */
const ORDERED_FAILURE_TYPES = ['PageSupportNeeded', 'SupportPending', 'Circumstantial'];

/** @type {Record<LH.Crdp.Page.BackForwardCacheNotRestoredReasonType, string | LH.IcuMessage>} */
const FAILURE_TYPE_TO_STRING = {
  PageSupportNeeded: str_(UIStrings.actionableFailureType),
  Circumstantial: str_(UIStrings.notActionableFailureType),
  SupportPending: str_(UIStrings.supportPendingFailureType),
};

class BFCache extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'bf-cache',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation', 'timespan'],
      guidanceLevel: 4,
      requiredArtifacts: ['BFCacheFailures', 'HostProduct'],
      scoreDisplayMode: Audit.SCORING_MODES.BINARY,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    if (/HeadlessChrome/.test(artifacts.HostProduct)) {
      return {
        score: null,
        notApplicable: true,
        warnings: [str_(UIStrings.warningHeadless)],
      };
    }

    const failures = artifacts.BFCacheFailures;
    if (!failures.length) return {score: 1};

    // TODO: Analyze more than one bf cache failure.
    const {notRestoredReasonsTree} = failures[0];

    let totalIssues = 0;

    /** @type {LH.Audit.Details.TableItem[]} */
    const results = [];

    for (const failureType of ORDERED_FAILURE_TYPES) {
      const reasonsMap = notRestoredReasonsTree[failureType];

      for (const [reason, frameUrls] of Object.entries(reasonsMap)) {
        totalIssues += frameUrls.length;

        results.push({
          reason: NotRestoredReasonDescription[reason]?.name ?? reason,
          failureType: FAILURE_TYPE_TO_STRING[failureType],
          subItems: {
            type: 'subitems',
            items: frameUrls.map(frameUrl => ({frameUrl})),
          },
          // Include hidden protocol reason code for debugging.
          protocolReason: reason,
        });
      }
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'reason', valueType: 'text', subItemsHeading: {key: 'frameUrl', valueType: 'url'}, label: str_(UIStrings.failureReasonColumn)},
      {key: 'failureType', valueType: 'text', label: str_(UIStrings.failureTypeColumn)},
      /* eslint-enable max-len */
    ];

    const details = Audit.makeTableDetails(headings, results);

    const displayValue = totalIssues ?
      str_(UIStrings.displayValue, {itemCount: totalIssues}) :
      undefined;

    return {
      score: results.length ? 0 : 1,
      displayValue,
      details,
    };
  }
}

export default BFCache;
export {UIStrings};
