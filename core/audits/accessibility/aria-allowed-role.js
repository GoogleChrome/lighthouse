/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures ARIA attributes are appropriate for an element's role.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accessibility audit that evaluates if the ARIA role attributes are valid for the HTML element. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Uses ARIA roles only on compatible elements',
  /** Title of an accessibility audit that evaluates if the ARIA role attributes are valid for the HTML element. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Uses ARIA roles on incompatible elements',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Many HTML elements can only be assigned certain ARIA roles. Using ARIA ' +
    'roles where they are not allowed can interfere with the accessibility of the web page. ' +
    '[Learn more about ARIA roles](https://dequeuniversity.com/rules/axe/4.9/aria-allowed-role).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ARIAAllowedRole extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-allowed-role',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default ARIAAllowedRole;
export {UIStrings};
