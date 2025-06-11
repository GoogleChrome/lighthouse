/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures that, if present, the `[xml:lang]` attribute value in an HTML document has
 * the same base language as the `[lang]` attribute.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the xml:lang attribute, if present, has the same base language as the `lang` attribute. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<html>` element has an `[xml:lang]` attribute with the same base language as the ' +
      '`[lang]` attribute.',
  /** Title of an accesibility audit that evaluates if the xml:lang attribute, if present, has the same base language as the `lang` attribute. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<html>` element does not have an `[xml:lang]` attribute with the same base ' +
      'language as the `[lang]` attribute.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'If the webpage does not specify a consistent language, then the screen ' +
      'reader might not announce the page\'s text correctly. ' +
      '[Learn more about the `lang` attribute](https://dequeuniversity.com/rules/axe/4.10/html-xml-lang-mismatch).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class HTMLXMLLangMismatch extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'html-xml-lang-mismatch',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default HTMLXMLLangMismatch;
export {UIStrings};
