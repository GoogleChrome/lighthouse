/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures lang attributes have valid values.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all lang HTML attributes are valid BCP 47 languages. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[lang]` attributes have a valid value',
  /** Title of an accesibility audit that evaluates if all lang HTML attributes are valid BCP 47 languages. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[lang]` attributes do not have a valid value',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Specifying a valid [BCP 47 language](https://www.w3.org/International/questions/qa-choosing-language-tags#question) ' +
      'on elements helps ensure that text is pronounced correctly by a screen reader. ' +
      '[Learn how to use the `lang` attribute](https://dequeuniversity.com/rules/axe/4.10/valid-lang).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ValidLang extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'valid-lang',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default ValidLang;
export {UIStrings};
