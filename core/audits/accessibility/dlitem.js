/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that all child <dd> and <dt> elements have a <dl> as a parent.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all definition list item elements (`<dt>`/`<dd>`) have a definition list parent element (`<dl>`). This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Definition list items are wrapped in `<dl>` elements',
  /** Title of an accesibility audit that evaluates if all definition list item elements (`<dt>`/`<dd>`) have a definition list parent element (`<dl>`). This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Definition list items are not wrapped in `<dl>` elements',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Definition list items (`<dt>` and `<dd>`) must be wrapped in a ' +
      'parent `<dl>` element to ensure that screen readers can properly announce them. ' +
      '[Learn how to structure definition lists correctly](https://dequeuniversity.com/rules/axe/4.10/dlitem).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class DLItem extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'dlitem',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default DLItem;
export {UIStrings};
