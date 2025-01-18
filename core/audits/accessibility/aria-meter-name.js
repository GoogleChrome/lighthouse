/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures every ARIA meter element has an accessible name
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accessibility audit that evaluates if meter HTML elements have an accessible name. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'ARIA `meter` elements have accessible names',
  /** Title of an accessibility audit that evaluates if meter HTML elements do not have accessible names. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'ARIA `meter` elements do not have accessible names.',
  /** Description of a Lighthouse audit that tells the user *why* they should have accessible names for HTML 'meter' elements. This is displayed after a user expands the section to see more. No character length limits. 'Learn how...' becomes link text to additional documentation. */
  description: 'When a meter element doesn\'t have an accessible name, screen readers announce it with a generic name, making it unusable for users who rely on screen readers. [Learn how to name `meter` elements](https://dequeuniversity.com/rules/axe/4.10/aria-meter-name).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaMeterName extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-meter-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaMeterName;
export {UIStrings};
