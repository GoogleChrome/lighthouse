/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to see if it is requesting usage of the notification API on
 * page load. This is often a sign of poor user experience because it lacks context.
 */

'use strict';

const ViolationAudit = require('../violation-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the page's notification permission requests. This descriptive title is shown to users when the page does not ask for notification permission on load. */
  title: 'Avoids requesting the notification permission on page load',
  /** Title of a Lighthouse audit that provides detail on the page's notification permission requests. This descriptive title is shown to users when the page does ask for notification permission on load. */
  failureTitle: 'Requests the notification permission on page load',
  /** Description of a Lighthouse audit that tells the user why they should not ask for notification permission on load. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Users are mistrustful of or confused by sites that request to send ' +
      'notifications without context. Consider tying the request to user gestures ' +
      'instead. [Learn more](https://web.dev/notification-on-start).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      requiredArtifacts: ['ConsoleMessages'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const results = ViolationAudit.getViolationResults(artifacts, /notification permission/);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'label', itemType: 'text', text: str_(i18n.UIStrings.columnLocation)},
    ];
    // TODO(bckenny): see TODO in geolocation-on-start
    const details = ViolationAudit.makeTableDetails(headings, results);

    return {
      score: Number(results.length === 0),
      extendedInfo: {
        value: results,
      },
      details,
    };
  }
}

module.exports = NotificationOnStart;
module.exports.UIStrings = UIStrings;
