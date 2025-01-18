/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures each page has at least one mechanism for a user to bypass navigation
 * and jump straight to the content.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the page has elements that let screen reader users skip over repetitive content. `heading`, `skip link`, and `landmark region` are technical terms for the elements that enable quick page navigation. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'The page contains a heading, skip link, or landmark region',
  /** Title of an accesibility audit that evaluates if the page has elements that let screen reader users skip over repetitive content. `heading`, `skip link`, and `landmark region` are technical terms for the elements that enable quick page navigation. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'The page does not contain a heading, skip link, or landmark region',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Adding ways to bypass repetitive content lets keyboard users navigate the ' +
      'page more efficiently. ' +
      '[Learn more about bypass blocks](https://dequeuniversity.com/rules/axe/4.10/bypass).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class Bypass extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'bypass',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: AxeAudit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default Bypass;
export {UIStrings};
