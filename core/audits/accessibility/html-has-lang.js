/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures every HTML document has a `lang` attribute.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if the root HTML tag has a lang attribute identifying the page's language. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<html>` element has a `[lang]` attribute',
  /** Title of an accesibility audit that evaluates if the root HTML tag has a lang attribute identifying the page's language. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<html>` element does not have a `[lang]` attribute',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'If a page doesn\'t specify a `lang` attribute, a screen reader assumes ' +
      'that the page is in the default language that the user chose when setting up the ' +
      'screen reader. If the page isn\'t actually in the default language, then the screen ' +
      'reader might not announce the page\'s text correctly. ' +
      '[Learn more about the `lang` attribute](https://dequeuniversity.com/rules/axe/4.10/html-has-lang).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class HTMLHasLang extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'html-has-lang',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default HTMLHasLang;
export {UIStrings};
