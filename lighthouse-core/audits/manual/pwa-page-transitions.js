/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('./manual-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that prompts the user to manually check that page transitions (navigating to other pages on a website) shouldn't feel like they are waiting for the network to load. */
  title: 'Page transitions don\'t feel like they block on the network',
  /** Description of a Lighthouse audit that tells the user why they should make transitions in their web app feel fast. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Transitions should feel snappy as you tap around, even on a slow network. ' +
    'This experience is key to a user\'s perception of performance. [Learn more](https://web.dev/pwa-page-transitions).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview Manual PWA audit for janky-free page transitions.
 */

class PWAPageTransitions extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'pwa-page-transitions',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
    }, super.partialMeta);
  }
}

module.exports = PWAPageTransitions;
module.exports.UIStrings = UIStrings;
