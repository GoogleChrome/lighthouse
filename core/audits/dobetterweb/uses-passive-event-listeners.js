/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit a page to see if it is using passive event listeners on
 * scroll-blocking touch and wheel event listeners.
 */


import ViolationAudit from '../violation-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the page's use of passive event listeners used to improve the scrolling performance of the page. This descriptive title is shown to users when the page does use passive listeners. */
  title: 'Uses passive listeners to improve scrolling performance',
  /** Title of a Lighthouse audit that provides detail on the page's use of passive event listeners used to improve the scrolling performance of the page. This descriptive title is shown to users when the page does not use passive listeners. */
  failureTitle: 'Does not use passive listeners to improve scrolling performance',
  /** Description of a Lighthouse audit that tells the user why they should use passive event listeners on the page. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Consider marking your touch and wheel event listeners as `passive` ' +
      'to improve your page\'s scroll performance. ' +
      '[Learn more about adopting passive event listeners](https://developer.chrome.com/docs/lighthouse/best-practices/uses-passive-event-listeners/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class PassiveEventsAudit extends ViolationAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-passive-event-listeners',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['ConsoleMessages', 'SourceMaps', 'Scripts'],
      scoreDisplayMode: ViolationAudit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const results =
      await ViolationAudit.getViolationResults(artifacts, context, /passive event listener/);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', valueType: 'source-location', label: str_(i18n.UIStrings.columnSource)},
    ];
    // TODO(bckenny): see TODO in geolocation-on-start
    const details = ViolationAudit.makeTableDetails(headings, results);

    return {
      score: Number(results.length === 0),
      details,
    };
  }
}

export default PassiveEventsAudit;
export {UIStrings};
