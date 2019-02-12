/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('../../manual/manual-audit');
const i18n = require('../../../lib/i18n/i18n.js');

const UIStrings = {
  /** Description that prompts the user to take additional steps to test how compatible the page is with mobile devices such as cellphones. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Take the [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly) to check for audits not covered by Lighthouse, like sizing tap targets appropriately. [Learn more](https://developers.google.com/search/mobile-sites/).',
  /** Title of a Lighthouse audit that prompts users to manually check their page for compatibility with mobile devices such as cellphones. */
  title: 'Page is mobile friendly',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview Manual SEO audit to check if page is mobile friendly.
 */

class MobileFriendly extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'mobile-friendly',
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
    }, super.partialMeta);
  }
}

module.exports = MobileFriendly;
module.exports.UIStrings = UIStrings;
