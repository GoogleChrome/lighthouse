/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that ARIA attributes are used as specified for element roles.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accessibility audit that checks if ARIA attributes are used as specified for element roles. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'ARIA attributes are used as specified for the element\'s role',
  /** Title of an accessibility audit that checks if ARIA attributes are used as specified for element roles. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'ARIA attributes are not used as specified for the element\'s role',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Some ARIA attributes are only allowed on an element under certain conditions. ' +
      '[Learn more about conditional ARIA attributes](https://dequeuniversity.com/rules/axe/4.10/aria-conditional-attr).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaConditionalAttr extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-conditional-attr',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaConditionalAttr;
export {UIStrings};
