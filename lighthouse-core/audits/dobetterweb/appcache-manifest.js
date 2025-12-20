/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to ensure it is not using the Application Cache API.
 */

'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the use of the Application Cache API. This descriptive title is shown to users when they do not use the Application Cache API. */
  title: 'Avoids Application Cache',
  /** Title of a Lighthouse audit that provides detail on the use of the Application Cache API. This descriptive title is shown to users when they do use the Application Cache API, which is considered bad practice. */
  failureTitle: 'Uses Application Cache',
  /** Description of a Lighthouse audit that tells the user why they should not use the Application Cache API. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Application Cache is deprecated. ' +
    '[Learn more](https://web.dev/appcache-manifest).',
  /**
   * @description Label for the audit identifying uses of the Application Cache.
   * @example {clock.appcache} AppCacheManifest
   */
  displayValue: 'Found "{AppCacheManifest}"',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class AppCacheManifestAttr extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'appcache-manifest',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['AppCacheManifest'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    // Fails if an AppCacheManifest was found.
    if (artifacts.AppCacheManifest !== null) {
      return {
        score: 0,
        displayValue: str_(UIStrings.displayValue, {AppCacheManifest: artifacts.AppCacheManifest}),
      };
    }

    return {
      score: 1,
    };
  }
}

module.exports = AppCacheManifestAttr;
module.exports.UIStrings = UIStrings;
