/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('../../manual/manual-audit.js');
const i18n = require('../../../lib/i18n/i18n.js');

const UIStrings = {
  /** Description of a Lighthouse audit that provides detail on the structured data in a page. "Structured data" is a standardized data format on a page that helps a search engine categorize and understand its contents. This description is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Run the [Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool/) and the [Structured Data Linter](http://linter.structured-data.org/) to validate structured data. [Learn more](https://web.dev/structured-data).',
  /** Title of a Lighthouse audit that prompts users to manually check their page for valid structured data. "Structured data" is a standardized data format on a page that helps a search engine categorize and understand its contents. */
  title: 'Structured data is valid',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview Manual SEO audit to check if structured data on page is valid.
 */

class StructuredData extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'structured-data',
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
    }, super.partialMeta);
  }
}

module.exports = StructuredData;
module.exports.UIStrings = UIStrings;
