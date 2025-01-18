/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures ARIA attributes are allowed for an element's role.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the ARIA HTML attributes are misaligned with the aria-role HTML attribute specificed on the element, such mismatches are invalid. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[aria-*]` attributes match their roles',
  /** Title of an accesibility audit that evaluates if the ARIA HTML attributes are misaligned with the aria-role HTML attribute specificed on the element, such mismatches are invalid. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[aria-*]` attributes do not match their roles',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Each ARIA `role` supports a specific subset of `aria-*` attributes. ' +
      'Mismatching these invalidates the `aria-*` attributes. [Learn ' +
      'how to match ARIA attributes to their roles](https://dequeuniversity.com/rules/axe/4.10/aria-allowed-attr).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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

export default ARIAAllowedAttr;
export {UIStrings};
