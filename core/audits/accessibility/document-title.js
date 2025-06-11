/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that each HTML document contains a `<title>`.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the page has a <title> element that describes the page. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Document has a `<title>` element',
  /** Title of an accesibility audit that evaluates if the page has a <title> element that describes the page. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Document doesn\'t have a `<title>` element',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'The title gives screen reader users an overview of the page, and search ' +
      'engine users rely on it heavily to determine if a page is relevant to their search. ' +
      '[Learn more about document titles](https://dequeuniversity.com/rules/axe/4.10/document-title).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class DocumentTitle extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'document-title',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default DocumentTitle;
export {UIStrings};
