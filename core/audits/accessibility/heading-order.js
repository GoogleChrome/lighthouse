/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures heading levels should only ever increase by one.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that checks if heading elements (<h1>, <h2>, etc) appear in numeric order and only ever increase in steps of 1. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'Heading elements appear in a sequentially-descending order',
  /** Title of an accesibility audit that checks if heading elements (<h1>, <h2>, etc) appear in numeric order and only ever increase in steps of 1. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Heading elements are not in a sequentially-descending order',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Properly ordered headings that do not skip levels convey the semantic structure of the page, making it easier to navigate and understand when using assistive technologies. [Learn more about heading order](https://dequeuniversity.com/rules/axe/4.10/heading-order).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class HeadingOrder extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'heading-order',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default HeadingOrder;
export {UIStrings};
