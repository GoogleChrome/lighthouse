/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it is using passive event listeners on
 * scroll-blocking touch and wheel event listeners.
 */

'use strict';

const ViolationAudit = require('../violation-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the page's use of passive event listeners used to improve the scrolling performance of the page. This descriptive title is shown to users when the page does use passive listeners. */
  title: 'Uses passive listeners to improve scrolling performance',
  /** Title of a Lighthouse audit that provides detail on the page's use of passive event listeners used to improve the scrolling performance of the page. This descriptive title is shown to users when the page does not use passive listeners. */
  failureTitle: 'Does not use passive listeners to improve scrolling performance',
  /** Description of a Lighthouse audit that tells the user why they should use passive event listeners on the page. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Consider marking your touch and wheel event listeners as `passive` ' +
      'to improve your page\'s scroll performance. ' +
      '[Learn more](https://web.dev/uses-passive-event-listeners).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      requiredArtifacts: ['ConsoleMessages'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const results = ViolationAudit.getViolationResults(artifacts, /passive event listener/);

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

module.exports = PassiveEventsAudit;
module.exports.UIStrings = UIStrings;
