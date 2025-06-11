/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that deprecated ARIA roles are not used.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accessibility audit that checks if elements use prohibited ARIA attributes. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Elements use only permitted ARIA attributes',
  /** Title of an accessibility audit that checks if elements use prohibited ARIA attributes. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Elements use prohibited ARIA attributes',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Using ARIA attributes in roles where they are prohibited can mean that important ' +
      'information is not communicated to users of assistive technologies. ' +
      '[Learn more about prohibited ARIA roles](https://dequeuniversity.com/rules/axe/4.10/aria-prohibited-attr).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaProhibitedAttr extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-prohibited-attr',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaProhibitedAttr;
export {UIStrings};
