/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensure that each table header in a data table refers to data cells.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all table header elements have children. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<th>` elements and elements with `[role="columnheader"/"rowheader"]` have ' +
      'data cells they describe.',
  /** Title of an accesibility audit that evaluates if all table header elements have children. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<th>` elements and elements with ' +
      '`[role="columnheader"/"rowheader"]` do not have data cells they describe.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Screen readers have features to make navigating tables easier. Ensuring ' +
      'table headers always refer to some set of cells may improve the experience for screen ' +
      'reader users. ' +
      '[Learn more about table headers](https://dequeuniversity.com/rules/axe/4.10/th-has-data-cells).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class THHasDataCells extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'th-has-data-cells',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: AxeAudit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default THHasDataCells;
export {UIStrings};
