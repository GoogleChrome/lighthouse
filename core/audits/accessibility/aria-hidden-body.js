/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures `aria-hidden='true'` is not present on the document body.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that checks if the html <body> element does not have an aria-hidden attribute set on it. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[aria-hidden="true"]` is not present on the document `<body>`',
  /** Title of an accesibility audit that checks if the html <body> element does not have an aria-hidden attribute set on it. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[aria-hidden="true"]` is present on the document `<body>`',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Assistive technologies, like screen readers, work inconsistently when `aria-hidden="true"` is set on the document `<body>`. [Learn how `aria-hidden` affects the document body](https://dequeuniversity.com/rules/axe/4.10/aria-hidden-body).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaHiddenBody extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-hidden-body',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaHiddenBody;
export {UIStrings};
