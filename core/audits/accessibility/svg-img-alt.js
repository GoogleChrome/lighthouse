/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures SVG elements with an img role have an accessible text alternative.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accessibility audit that evaluates if SVG elements with an img role have an accessible text alternative. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'SVG elements with an `img` role have an accessible text alternative',
  /** Title of an accessibility audit that evaluates if SVG elements with an img role have an accessible text alternative. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'SVG elements with an `img` role do not have an accessible text alternative',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with \'Learn\' becomes link text to additional documentation. */
  description: 'Ensures SVG elements with an `img`, `graphics-document` or `graphics-symbol` ' +
      'role have an accessible text alternative. ' +
      '[Learn more about SVG alt text](https://dequeuniversity.com/rules/axe/4.11/svg-img-alt).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class SvgImgAlt extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'svg-img-alt',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default SvgImgAlt;
export {UIStrings};
