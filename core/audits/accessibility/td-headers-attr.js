/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensure that each cell in a table using the headers refers to another cell in
 * that table
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all table cell elements in a table that use the headers HTML attribute use it correctly to refer to header cells within the same table. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Cells in a `<table>` element that use the `[headers]` attribute refer ' +
      'to table cells within the same table.',
  /** Title of an accesibility audit that evaluates if all table cell elements in a table that use the headers HTML attribute use it correctly to refer to header cells within the same table. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Cells in a `<table>` element that use the `[headers]` attribute refer ' +
      'to an element `id` not found within the same table.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Screen readers have features to make navigating tables easier. Ensuring ' +
      '`<td>` cells using the `[headers]` attribute only refer to other cells in the same ' +
      'table may improve the experience for screen reader users. ' +
      '[Learn more about the `headers` attribute](https://dequeuniversity.com/rules/axe/4.10/td-headers-attr).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class TDHeadersAttr extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'td-headers-attr',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default TDHeadersAttr;
export {UIStrings};
