/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures elements with [role="img"] have discernible text.
 * See base class in axe-audit.js for audit() implementation.
 *
 * See PR where role-img-alt-name was split out from image-alt:
 * @url https://github.com/dequelabs/axe-core/pull/1586
 */


const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all role=img elements are given names. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Elements with `[role=img]` have an accessible name',
  /** Title of an accesibility audit that evaluates if all role=img elements are given names. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Elements with `[role=img]` do not have an accessible name',
  /** Description of a Lighthouse audit that tells the user *why* they should have accessible names for meter elements. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'When an element doesn\'t have an accessible name, screen readers announce it with a generic name, making it unusable for users who rely on screen readers. [Learn more](https://dequeuniversity.com/rules/axe/4.1/role-img-alt?application=lighthouse).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class RoleImgAlt extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'role-img-alt',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = RoleImgAlt;
module.exports.UIStrings = UIStrings;
