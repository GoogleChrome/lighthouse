/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensure that interactive elements labeled with their content have their visible label as part of their accessible name.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if elements labeled through their content have their visible text as part of their accessible name. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Elements with visible text labels have matching accessible names.',
  /** Title of an accesibility audit that evaluates if elements labeled through their content have their visible text as part of their accessible name. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Elements with visible text labels do not have matching accessible names.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Visible text labels that do not match the accessible name can result in a ' +
      'confusing experience for screen reader users. ' +
      '[Learn more about accessible names](https://dequeuniversity.com/rules/axe/4.10/label-content-name-mismatch).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LabelContentNameMismatch extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'label-content-name-mismatch',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default LabelContentNameMismatch;
export {UIStrings};
