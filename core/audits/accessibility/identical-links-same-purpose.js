/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that identical links have the same purpose.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that checks if identical links have the same purpose. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Identical links have the same purpose.',
  /** Title of an accesibility audit that checks if identical links have the same purpose. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Identical links do not have the same purpose.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Links with the same destination should have the same description, to help users ' +
      'understand the link\'s purpose and decide whether to follow it. ' +
      '[Learn more about identical links](https://dequeuniversity.com/rules/axe/4.10/identical-links-same-purpose).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class IdenticalLinksSamePurpose extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'identical-links-same-purpose',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: AxeAudit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default IdenticalLinksSamePurpose;
export {UIStrings};
