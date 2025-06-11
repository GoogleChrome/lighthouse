/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures links have discernible text.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all link elements have a non-generic name to screen readers. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Links have a discernible name',
  /** Title of an accesibility audit that evaluates if all link elements have a non-generic name to screen readers. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Links do not have a discernible name',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Link text (and alternate text for images, when used as links) that is ' +
      'discernible, unique, and focusable improves the navigation experience for ' +
      'screen reader users. ' +
      '[Learn how to make links accessible](https://dequeuniversity.com/rules/axe/4.10/link-name).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LinkName extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'link-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default LinkName;
export {UIStrings};
