/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures `<dl>` elements are structured correctly.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all the definition list elements have valid markup for screen readers. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<dl>`\'s contain only properly-ordered `<dt>` and `<dd>` groups, `<script>`, ' +
      '`<template>` or `<div>` elements.',
  /** Title of an accesibility audit that evaluates if all the definition list elements have valid markup for screen readers. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<dl>`\'s do not contain only properly-ordered `<dt>` and `<dd>` ' +
      'groups, `<script>`, `<template>` or `<div>` elements.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'When definition lists are not properly marked up, screen readers may produce ' +
      'confusing or inaccurate output. ' +
      '[Learn how to structure definition lists correctly](https://dequeuniversity.com/rules/axe/4.10/definition-list).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class DefinitionList extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'definition-list',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default DefinitionList;
export {UIStrings};
