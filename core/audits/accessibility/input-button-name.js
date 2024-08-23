/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures input buttons have discernible text.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all input buttons have discernible text. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Input buttons have discernible text.',
  /** Title of an accesibility audit that evaluates if all input buttons have discernible text. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Input buttons do not have discernible text.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Adding discernable and accessible text to input buttons may help screen reader ' +
      'users understand the purpose of the input button. ' +
      '[Learn more about input buttons](https://dequeuniversity.com/rules/axe/4.10/input-button-name).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class InputButtonName extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'input-button-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default InputButtonName;
export {UIStrings};
