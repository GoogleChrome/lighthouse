/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensure that large tables have `[header]` attributes.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all large table elements use the headers HTML attribute. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<td>` elements in a large `<table>` have one or more table headers.',
  /** Title of an accesibility audit that evaluates if all large table elements use the headers HTML attribute. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<td>` elements in a large `<table>` do not have table headers.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Screen readers have features to make navigating tables easier. Ensuring ' +
      'that `<td>` elements in a large table (3 or more cells in width and height) have an ' +
      'associated table header may improve the experience for screen reader users. ' +
      '[Learn more about table headers](https://dequeuniversity.com/rules/axe/4.10/td-has-header).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class TDHasHeader extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'td-has-header',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default TDHasHeader;
export {UIStrings};
