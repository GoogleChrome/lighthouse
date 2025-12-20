/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensure that each cell in a table using the headers refers to another cell in
 * that table
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all table cell elements in a table that use the headers HTML attribute use it correctly to refer to header cells within the same table. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Cells in a `<table>` element that use the `[headers]` attribute refer ' +
      'to table cells within the same table.',
  /** Title of an accesibility audit that evaluates if all table cell elements in a table that use the headers HTML attribute use it correctly to refer to header cells within the same table. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Cells in a `<table>` element that use the `[headers]` attribute refer ' +
      'to an element `id` not found within the same table.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Screen readers have features to make navigating tables easier. Ensuring ' +
      '`<td>` cells using the `[headers]` attribute only refer to other cells in the same ' +
      'table may improve the experience for screen reader users. ' +
      '[Learn more](https://web.dev/td-headers-attr/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class TDHeadersAttr extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'td-headers-attr',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = TDHeadersAttr;
module.exports.UIStrings = UIStrings;
