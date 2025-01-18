/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ManualAudit from '../../manual/manual-audit.js';
import * as i18n from '../../../lib/i18n/i18n.js';

const UIStrings = {
  /** Description of a Lighthouse audit that provides detail on the structured data in a page. "Structured data" is a standardized data format on a page that helps a search engine categorize and understand its contents. This description is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Run the [Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool/) and the [Structured Data Linter](http://linter.structured-data.org/) to validate structured data. [Learn more about Structured Data](https://developer.chrome.com/docs/lighthouse/seo/structured-data/).',
  /** Title of a Lighthouse audit that prompts users to manually check their page for valid structured data. "Structured data" is a standardized data format on a page that helps a search engine categorize and understand its contents. */
  title: 'Structured data is valid',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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

export default StructuredData;
export {UIStrings};
