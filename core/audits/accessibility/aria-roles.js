/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures all elements with a role attribute use a valid value.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all elements have valid aria-role HTML attributes. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[role]` values are valid',
  /** Title of an accesibility audit that evaluates if all elements have valid aria-role HTML attributes. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[role]` values are not valid',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'ARIA roles must have valid values in order to perform their ' +
      'intended accessibility functions. ' +
      '[Learn more about valid ARIA roles](https://dequeuniversity.com/rules/axe/4.10/aria-roles).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaRoles extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-roles',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaRoles;
export {UIStrings};
