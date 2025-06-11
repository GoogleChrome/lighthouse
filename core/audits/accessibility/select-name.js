/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures select elements have programmatically associated label elements.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all select elements have programmatically associated label elements. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Select elements have associated label elements.',
  /** Title of an accesibility audit that evaluates if all select elements have programmatically associated label elements. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Select elements do not have associated label elements.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Form elements without effective labels can create frustrating experiences ' +
      'for screen reader users. ' +
      '[Learn more about the `select` element](https://dequeuniversity.com/rules/axe/4.10/select-name).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class SelectName extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'select-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default SelectName;
export {UIStrings};
