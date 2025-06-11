/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures buttons have discernible text.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all button elements have names accessible to screen readers. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Buttons have an accessible name',
  /** Title of an accesibility audit that evaluates if all button elements have names accessible to screen readers. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Buttons do not have an accessible name',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'When a button doesn\'t have an accessible name, screen readers announce it ' +
      'as "button", making it unusable for users who rely on screen readers. ' +
      '[Learn how to make buttons more accessible](https://dequeuniversity.com/rules/axe/4.10/button-name).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ButtonName extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'button-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default ButtonName;
export {UIStrings};
