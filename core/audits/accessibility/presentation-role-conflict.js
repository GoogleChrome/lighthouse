/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures elements which are marked to be removed from the accessibility tree are in fact removed.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accessibility audit that evaluates if elements with presentation role have conflicts. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Elements with `role="none"` or `role="presentation"` do not have conflicts',
  /** Title of an accessibility audit that evaluates if elements with presentation role have conflicts. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Elements with `role="none"` or `role="presentation"` have conflicts',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with \'Learn\' becomes link text to additional documentation. */
  description: 'There are certain cases where the semantic role of an element with `role="none"` ' +
      'or `role="presentation"` does not resolve to none or presentation. To ensure the ' +
      'element remains removed from the accessibility tree, you should not add any global ' +
      'ARIA attributes to the element or make it focusable. ' +
      '[Learn more about presentation role conflict](https://dequeuniversity.com/rules/axe/4.11/presentation-role-conflict).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class PresentationRoleConflict extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'presentation-role-conflict',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default PresentationRoleConflict;
export {UIStrings};
