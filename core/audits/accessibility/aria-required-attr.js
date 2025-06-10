/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures elements with ARIA roles have all required ARIA attributes.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all elements with the aria-role attribute have the other corresponding ARIA attributes set as well. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[role]`s have all required `[aria-*]` attributes',
  /** Title of an accesibility audit that evaluates if all elements with the aria-role attribute have the other corresponding ARIA attributes set as well. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[role]`s do not have all required `[aria-*]` attributes',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Some ARIA roles have required attributes that describe the state ' +
      'of the element to screen readers. [Learn more about roles and required attributes](https://dequeuniversity.com/rules/axe/4.10/aria-required-attr).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ARIARequiredAttr extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-required-attr',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default ARIARequiredAttr;
export {UIStrings};
