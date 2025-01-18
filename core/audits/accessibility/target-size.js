/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that touch targets have sufficient size and spacing.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that checks if all touch targets have sufficient size and spacing. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Touch targets have sufficient size and spacing.',
  /** Title of an accesibility audit that checks if all touch targets have sufficient size and spacing. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Touch targets do not have sufficient size or spacing.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Touch targets with sufficient size and spacing help users who may have ' +
      'difficulty targeting small controls to activate the targets. ' +
      '[Learn more about touch targets](https://dequeuniversity.com/rules/axe/4.10/target-size).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class TargetSize extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'target-size',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default TargetSize;
export {UIStrings};
