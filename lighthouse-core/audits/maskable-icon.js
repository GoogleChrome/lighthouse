/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const ManifestValues = require('../computed/manifest-values.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on if the manifest contains a maskable icon. This descriptive title is shown to users when the manifest contains at least one maskable icon. */
  title: 'Manifest has a maskable icon',
  /** Title of a Lighthouse audit that provides detial on if the manifest contains a maskable icon. this descriptive title is shown to users when the manifest contains no icons that are maskable. */
  failureTitle: 'Manifest doesn\'t have a maskable icon',
  /** Description of a Lighthouse audit that tells the user why they their manifest should have at least one maskable icon. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'A maskable icon ensures that the image fills the entire ' +
    'shape without being letterboxed when installing ' +
    'the app on a device. [Learn more](https://web.dev/maskable-icon-audit/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview
 * Audits if a manifest contains at least one icon that is maskable
 *
 * Requirements:
 *    * manifest is not empty
 *    * manifest has valid icons
 *    * at least one of the icons has a purpose of 'maskable'
 */

class MaskableIcon extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'maskable-icon',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['WebAppManifest', 'InstallabilityErrors'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const manifestValues = await ManifestValues.request(artifacts, context);
    if (manifestValues.isParseFailure) {
      return {
        score: 0,
        explanation: manifestValues.parseFailureReason,
      };
    }
    const maskableIconCheck = manifestValues.allChecks.find(i => i.id === 'hasMaskableIcon');
    return {
      score: (maskableIconCheck && maskableIconCheck.passing) ? 1 : 0,
    };
  }
}

module.exports = MaskableIcon;
module.exports.UIStrings = UIStrings;
