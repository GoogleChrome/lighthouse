/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures `<dl>` elements are structured correctly.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all the definition list elements have valid markup for screen readers. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<dl>`\'s contain only properly-ordered `<dt>` and `<dd>` groups, `<script>`, ' +
      '`<template>` or `<div>` elements.',
  /** Title of an accesibility audit that evaluates if all the definition list elements have valid markup for screen readers. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<dl>`\'s do not contain only properly-ordered `<dt>` and `<dd>` ' +
      'groups, `<script>`, `<template>` or `<div>` elements.',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'When definition lists are not properly marked up, screen readers may produce ' +
      'confusing or inaccurate output. ' +
      '[Learn more](https://web.dev/definition-list/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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

module.exports = DefinitionList;
module.exports.UIStrings = UIStrings;
