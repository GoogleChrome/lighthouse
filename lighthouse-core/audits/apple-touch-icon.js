/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

/**
 * @fileoverview Audits if a page has an `apple-touch-icon` link element with a valid href.
 */

const UIStrings = {
  /** Title of a Lighthouse audit that tells the user that their site contains a vaild touch icon. This descriptive title is shown when the page contains a valid iOS touch icon. "apple-touch-icon" is an HTML attribute value and should not be translated. */
  title: 'Provides a valid `apple-touch-icon`',
  /** Title of a Lighthouse audit that tells the user that their site contains a vaild touch icon. This descriptive title is shown when the page does not contain a valid iOS touch icon. "apple-touch-icon" is an HTML attribute value and should not be translated. */
  failureTitle: 'Does not provide a valid `apple-touch-icon`',
  /** Description of a Lighthouse audit that tells the user that having an apple-touch-icon allows websites to include an app icon to their installed progressive web apps, similar to a native app. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. "apple-touch-icon" is an HTML attribute value and should not be translated. */
  description: 'For ideal appearance on iOS when users add a progressive web app to the home ' +
    'screen, define an `apple-touch-icon`. It must point to a non-transparent 192px (or 180px) ' +
    'square PNG. [Learn More](https://web.dev/apple-touch-icon/).',
  /** Warning that HTML attribute `apple-touch-icon-precomposed` should not be used in favor of `apple-touch-icon`.  "apple-touch-icon-precomposed" and "apple-touch-icon" are HTML attribute values and should not be translated. */
  precomposedWarning: '`apple-touch-icon-precomposed` is out of date; ' +
    '`apple-touch-icon` is preferred.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class AppleTouchIcon extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'apple-touch-icon',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['LinkElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const appleTouchIcons = artifacts.LinkElements
      .filter(el => el.rel === 'apple-touch-icon' || el.rel === 'apple-touch-icon-precomposed')
      .filter(el => !!el.href);

    // Audit passes if an `apple-touch-icon` exists.
    const passed = appleTouchIcons.length !== 0;

    const warnings = [];
    if (appleTouchIcons.filter(el => el.rel === 'apple-touch-icon-precomposed').length !== 0
      && appleTouchIcons.filter(el => el.rel === 'apple-touch-icon').length === 0) {
      warnings.push(str_(UIStrings.precomposedWarning));
    }

    return {
      score: passed ? 1 : 0,
      warnings,
    };
  }
}

module.exports = AppleTouchIcon;
module.exports.UIStrings = UIStrings;
