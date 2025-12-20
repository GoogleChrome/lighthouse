/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the web page's ability to return content with Javascript disabled in the browser. This descriptive title is shown to users when at least some content is shown when Javascript is not available. */
  title: 'Contains some content when JavaScript is not available',
  /** Title of a Lighthouse audit that provides detail on the web page's ability to return content with Javascript disabled in the browser. This descriptive title is shown to users when no content is shown when Javascript is not available. */
  failureTitle: 'Does not provide fallback content when JavaScript is not available',
  /** Description of a Lighthouse audit that tells the user why they should return content even if Javascript is unavailable in a browser. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Your app should display some content when JavaScript is disabled, even if ' +
    'it\'s just a warning to the user that JavaScript is required to use the app. ' +
    '[Learn more](https://web.dev/without-javascript).',
  /** Message explaining that a website's body should render some (any) content even if the page's JavaScript cannot be loaded. */
  explanation: 'The page body should render some content if its scripts are not available.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class WithoutJavaScript extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'without-javascript',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['HTMLWithoutJavaScript'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const artifact = artifacts.HTMLWithoutJavaScript;

    // Fail pages that have empty text and are missing a noscript tag
    if (artifact.bodyText.trim() === '' && !artifact.hasNoScript) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanation),
      };
    }

    return {
      score: 1,
    };
  }
}

module.exports = WithoutJavaScript;
module.exports.UIStrings = UIStrings;
