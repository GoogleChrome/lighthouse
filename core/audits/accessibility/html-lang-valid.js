/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures the lang attribute of the <html> element has a valid value.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the value for root HTML tag's lang attribute is a valid BCP 47 language. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<html>` element has a valid value for its `[lang]` attribute',
  /** Title of an accesibility audit that evaluates if the value for root HTML tag's lang attribute is a valid BCP 47 language. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<html>` element does not have a valid value for ' +
      'its `[lang]` attribute.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Specifying a valid [BCP 47 language](https://www.w3.org/International/questions/qa-choosing-language-tags#question) ' +
      'helps screen readers announce text properly. ' +
      '[Learn how to use the `lang` attribute](https://dequeuniversity.com/rules/axe/4.10/html-lang-valid).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class HTMLLangValid extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'html-lang-valid',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default HTMLLangValid;
export {UIStrings};
