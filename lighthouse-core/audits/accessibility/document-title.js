/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures that each HTML document contains a `<title>`.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the page has a <title> element that describes the page. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Document has a `<title>` element',
  /** Title of an accesibility audit that evaluates if the page has a <title> element that describes the page. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Document doesn\'t have a `<title>` element',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'The title gives screen reader users an overview of the page, and search ' +
      'engine users rely on it heavily to determine if a page is relevant to their search. ' +
      '[Learn more](https://web.dev/document-title/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class DocumentTitle extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'document-title',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = DocumentTitle;
module.exports.UIStrings = UIStrings;
