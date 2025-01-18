/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that links can be distinguished without relying on color.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all link elements can be distinguished without relying on color. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Links are distinguishable without relying on color.',
  /** Title of an accesibility audit that evaluates if all link elements can be distinguished without relying on color. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Links rely on color to be distinguishable.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Low-contrast text is difficult or impossible for many users to read. Link text ' +
      'that is discernible improves the experience for users with low vision. ' +
      '[Learn how to make links distinguishable](https://dequeuniversity.com/rules/axe/4.10/link-in-text-block).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LinkInTextBlock extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'link-in-text-block',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default LinkInTextBlock;
export {UIStrings};
