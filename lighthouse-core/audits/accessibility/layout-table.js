/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures presentational `<table>` elements do not use `<th>`, `<caption>` elements
 * or the summary attribute.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if a table intended for layout contains data annotations as it can be confusing for screen readers. This is evaluated by checking if tables with the ARIA role of `presentation` or `none` contain any data elements such as table headers (`<th>`). This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Presentational `<table>` elements avoid using `<th>`, `<caption>` or the ' +
      '`[summary]` attribute.',
  /** Title of an accesibility audit that evaluates if a table intended for layout contains data annotations as it can be confusing for screen readers. This is evaluated by checking if tables with the ARIA role of `presentation` or `none` contain any data elements such as table headers (`<th>`). This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Presentational `<table>` elements do not avoid using `<th>`, ' +
      '`<caption>` or the `[summary]` attribute.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'A table being used for layout purposes should not include data elements, ' +
      'such as the th or caption elements or the summary attribute, because this can ' +
      'create a confusing experience for screen reader users. ' +
      '[Learn more](https://web.dev/layout-table/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class LayoutTable extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'layout-table',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = LayoutTable;
module.exports.UIStrings = UIStrings;
