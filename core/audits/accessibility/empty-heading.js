/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that headings are not empty.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that checks if all heading elements have content. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'All heading elements contain content.',
  /** Title of an accesibility audit that checks if all heading elements have content. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Heading elements do not contain content.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'A heading with no content or inaccessible text prevent screen reader users from ' +
      'accessing information on the page\'s structure. ' +
      '[Learn more about headings](https://dequeuniversity.com/rules/axe/4.10/empty-heading).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class EmptyHeading extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'empty-heading',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: AxeAudit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default EmptyHeading;
export {UIStrings};
