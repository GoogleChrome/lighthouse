/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that the document has a main landmark.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that checks if the document has a main landmark. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Document has a main landmark.',
  /** Title of an accesibility audit that checks if the document has a main landmark. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Document does not have a main landmark.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'One main landmark helps screen reader users navigate a web page. ' +
      '[Learn more about landmarks](https://dequeuniversity.com/rules/axe/4.10/landmark-one-main).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LandmarkOneMain extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'landmark-one-main',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: AxeAudit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default LandmarkOneMain;
export {UIStrings};
