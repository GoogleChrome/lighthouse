/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to see if it is requesting usage of the notification API on
 * page load. This is often a sign of poor user experience because it lacks context.
 */


import ViolationAudit from '../violation-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the page's notification permission requests. This descriptive title is shown to users when the page does not ask for notification permission on load. */
  title: 'Avoids requesting the notification permission on page load',
  /** Title of a Lighthouse audit that provides detail on the page's notification permission requests. This descriptive title is shown to users when the page does ask for notification permission on load. */
  failureTitle: 'Requests the notification permission on page load',
  /** Description of a Lighthouse audit that tells the user why they should not ask for notification permission on load. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Users are mistrustful of or confused by sites that request to send ' +
      'notifications without context. Consider tying the request to user gestures ' +
      'instead. [Learn more about responsibly getting permission for notifications](https://developer.chrome.com/docs/lighthouse/best-practices/notification-on-start/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NotificationOnStart extends ViolationAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'notification-on-start',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      requiredArtifacts: ['ConsoleMessages', 'SourceMaps', 'Scripts'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const results =
      await ViolationAudit.getViolationResults(artifacts, context, /notification permission/);

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

export default NotificationOnStart;
export {UIStrings};
