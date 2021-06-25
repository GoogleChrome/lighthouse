/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
  * @fileoverview Ensures every select element has a label.
  * See base class in axe-audit.js for audit() implementation.
  *
  * See PR where select-name was split out from label:
  * @url https://github.com/dequelabs/axe-core/pull/2448
  */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all select elements have corresponding label elements. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Select elements have associated labels',
  /** Title of an accesibility audit that evaluates if all select elements have corresponding label elements. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Select elements do not have associated labels',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Labels ensure that dropdowns are announced properly by assistive ' +
       'technologies, like screen readers. [Learn ' +
       'more](https://dequeuniversity.com/rules/axe/4.1/select-name?application=lighthouse).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class SelectName extends AxeAudit {
  /**
    * @return {LH.Audit.Meta}
    */
  static get meta() {
    return {
      id: 'select-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = SelectName;
module.exports.UIStrings = UIStrings;
