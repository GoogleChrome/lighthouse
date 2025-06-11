/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensure that table summary and caption have different content.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if tables have different content in the summary attribute and caption element. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Tables have different content in the summary attribute and `<caption>`.',
  /** Title of an accesibility audit that evaluates if tables have different content in the summary attribute and caption element. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Tables have the same content in the summary attribute and `<caption>.`',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'The summary attribute should describe the table structure, while `<caption>` ' +
      'should have the onscreen title. Accurate table mark-up helps users of screen readers. ' +
      '[Learn more about summary and caption](https://dequeuniversity.com/rules/axe/4.10/table-duplicate-name).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class TableDuplicateName extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'table-duplicate-name',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default TableDuplicateName;
export {UIStrings};
