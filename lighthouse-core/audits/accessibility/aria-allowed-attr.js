/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures ARIA attributes are allowed for an element's role.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the ARIA HTML attributes are misaligned with the aria-role HTML attribute specificed on the element, such mismatches are invalid. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[aria-*]` attributes match their roles',
  /** Title of an accesibility audit that evaluates if the ARIA HTML attributes are misaligned with the aria-role HTML attribute specificed on the element, such mismatches are invalid. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[aria-*]` attributes do not match their roles',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Each ARIA `role` supports a specific subset of `aria-*` attributes. ' +
      'Mismatching these invalidates the `aria-*` attributes. [Learn ' +
      'more](https://web.dev/aria-allowed-attr/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ARIAAllowedAttr extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-allowed-attr',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = ARIAAllowedAttr;
module.exports.UIStrings = UIStrings;
