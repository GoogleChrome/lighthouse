/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures lang attributes have valid values.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all lang HTML attributes are valid BCP 47 languages. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[lang]` attributes have a valid value',
  /** Title of an accesibility audit that evaluates if all lang HTML attributes are valid BCP 47 languages. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[lang]` attributes do not have a valid value',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Specifying a valid [BCP 47 language](https://www.w3.org/International/questions/qa-choosing-language-tags#question) ' +
      'on elements helps ensure that text is pronounced correctly by a screen reader. ' +
      '[Learn more](https://web.dev/valid-lang/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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

module.exports = ValidLang;
module.exports.UIStrings = UIStrings;
