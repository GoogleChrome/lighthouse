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
  /** Title of an accessibility audit that checks if deprecated ARIA roles are used. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Deprecated ARIA roles were not used',
  /** Title of an accessibility audit that checks if deprecated ARIA roles are used. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Deprecated ARIA roles were used',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Deprecated ARIA roles may not be processed correctly by assistive technology. ' +
      '[Learn more about deprecated ARIA roles](https://dequeuniversity.com/rules/axe/4.10/aria-deprecated-role).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaDeprecatedRole extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-deprecated-role',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaDeprecatedRole;
export {UIStrings};
