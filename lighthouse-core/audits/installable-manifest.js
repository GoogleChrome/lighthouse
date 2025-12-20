/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit.js');
const ManifestValues = require('../computed/manifest-values.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is installable. */
  title: 'Web app manifest meets the installability requirements',
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is not installable. */
  failureTitle: 'Web app manifest does not meet the installability requirements',
  /** Description of a Lighthouse audit that tells the user why installability is important for webapps. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Browsers can proactively prompt users to add your app to their homescreen, ' +
    'which can lead to higher engagement. ' +
    '[Learn more](https://web.dev/installable-manifest).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview
 * Audits if the page's web app manifest qualifies for triggering a beforeinstallprompt event.
 * https://github.com/GoogleChrome/lighthouse/issues/23#issuecomment-270453303
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has valid start url
 *   * manifest has a valid name
 *   * manifest has a valid shortname
 *   * manifest display property is standalone, minimal-ui, or fullscreen
 *   * manifest contains icon that's a png and size >= 144px
 */

class InstallableManifest extends MultiCheckAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'installable-manifest',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['URL', 'WebAppManifest', 'InstallabilityErrors'],
    };
  }

  /**
   * @param {LH.Artifacts.ManifestValues} manifestValues
   * @return {Array<string>}
   */
  static assessManifest(manifestValues) {
    if (manifestValues.isParseFailure && manifestValues.parseFailureReason) {
      return [manifestValues.parseFailureReason];
    }

    /** @type {Array<string>} */
    const failures = [];
    const bannerCheckIds = [
      'hasName',
      // Technically shortname isn't required (if name is defined):
      //   https://cs.chromium.org/chromium/src/chrome/browser/installable/installable_manager.cc?type=cs&q=IsManifestValidForWebApp+f:cc+-f:test&sq=package:chromium&l=473
      // Despite this, we think it's better to require it anyway.
      // short_name is preferred for the homescreen icon, but a longer name can be used in
      // the splash screen and app title. Given the different usecases, we'd like to make it clearer
      // that the developer has two possible strings to work with.
      'hasShortName',
      'hasStartUrl',
      'hasPWADisplayValue',
      'hasIconsAtLeast144px',
      'fetchesIcon',
    ];
    manifestValues.allChecks
      .filter(item => bannerCheckIds.includes(item.id))
      .forEach(item => {
        if (!item.passing) {
          failures.push(item.failureText);
        }
      });

    return failures;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{failures: Array<string>, manifestValues: LH.Artifacts.ManifestValues}>}
   */
  static async audit_(artifacts, context) {
    const manifestValues = await ManifestValues.request(artifacts, context);
    const manifestFailures = InstallableManifest.assessManifest(manifestValues);

    return {
      failures: [
        ...manifestFailures,
      ],
      manifestValues,
    };
  }
}

module.exports = InstallableManifest;
module.exports.UIStrings = UIStrings;
