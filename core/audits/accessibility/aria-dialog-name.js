/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures every ARIA dialog element has a discernable, accessible name.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accessibility audit that evaluates if ARIA dialog elements have an accessible name. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Elements with `role="dialog"` or `role="alertdialog"` have accessible names.',
  /** Title of an accessibility audit that evaluates if ARIA dialog elements do not have accessible names. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Elements with `role="dialog"` or `role="alertdialog"` do not have accessible ' +
      'names.',
  /** Description of a Lighthouse audit that tells the user *why* they should have accessible names for ARIA dialog elements. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'ARIA dialog elements without accessible names may prevent screen readers users ' +
      'from discerning the purpose of these elements. ' +
      '[Learn how to make ARIA dialog elements more accessible](https://dequeuniversity.com/rules/axe/4.10/aria-dialog-name).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaDialogName extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-dialog-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaDialogName;
export {UIStrings};
