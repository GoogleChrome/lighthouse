/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const icons = require('../lib/icons.js');

const PWA_DISPLAY_VALUES = ['minimal-ui', 'fullscreen', 'standalone'];

// Historically, Chrome recommended 12 chars as the maximum short_name length to prevent truncation.
// For more discussion, see https://github.com/GoogleChrome/lighthouse/issues/69 and https://developer.chrome.com/apps/manifest/name#short_name
const SUGGESTED_SHORTNAME_LENGTH = 12;

class ManifestValues {
  /** @typedef {(val: NonNullable<LH.Artifacts.Manifest['value']>, errors: LH.Artifacts.InstallabilityErrors['errors']) => boolean} Validator */

  /**
   * @return {Array<{id: LH.Artifacts.ManifestValueCheckID, failureText: string, validate: Validator}>}
   */
  static get manifestChecks() {
    return [
      {
        id: 'hasStartUrl',
        failureText: 'Manifest does not contain a `start_url`',
        validate: manifestValue => !!manifestValue.start_url.value,
      },
      {
        id: 'hasIconsAtLeast144px',
        failureText: 'Manifest does not have a PNG icon of at least 144px',
        validate: manifestValue => icons.doExist(manifestValue) &&
            icons.pngSizedAtLeast(144, manifestValue).length > 0,
      },
      {
        id: 'hasIconsAtLeast512px',
        failureText: 'Manifest does not have a PNG icon of at least 512px',
        validate: manifestValue => icons.doExist(manifestValue) &&
            icons.pngSizedAtLeast(512, manifestValue).length > 0,
      },
      {
        id: 'fetchesIcon',
        failureText: 'Manifest icon failed to be fetched',
        validate: (manifestValue, errors) => {
          const failedToFetchIconErrorIds = [
            'cannot-download-icon',
            'no-icon-available',
          ];
          return icons.doExist(manifestValue) &&
            !errors.some(error => failedToFetchIconErrorIds.includes(error.errorId));
        },
      },
      {
        id: 'hasPWADisplayValue',
        failureText: 'Manifest\'s `display` value is not one of: ' + PWA_DISPLAY_VALUES.join(' | '),
        validate: manifestValue => PWA_DISPLAY_VALUES.includes(manifestValue.display.value),
      },
      {
        id: 'hasBackgroundColor',
        failureText: 'Manifest does not have `background_color`',
        validate: manifestValue => !!manifestValue.background_color.value,
      },
      {
        id: 'hasThemeColor',
        failureText: 'Manifest does not have `theme_color`',
        validate: manifestValue => !!manifestValue.theme_color.value,
      },
      {
        id: 'hasShortName',
        failureText: 'Manifest does not have `short_name`',
        validate: manifestValue => !!manifestValue.short_name.value,
      },
      {
        id: 'shortNameLength',
        failureText: `Manifest's \`short_name\` is too long (>${SUGGESTED_SHORTNAME_LENGTH} ` +
          `characters) to be displayed on a homescreen without truncation`,
        // Pass if there's no short_name. Don't want to report a non-existent string is too long
        validate: manifestValue => !!manifestValue.short_name.value &&
            manifestValue.short_name.value.length <= SUGGESTED_SHORTNAME_LENGTH,
      },
      {
        id: 'hasName',
        failureText: 'Manifest does not have `name`',
        validate: manifestValue => !!manifestValue.name.value,
      },
      {
        id: 'hasMaskableIcon',
        failureText: 'Manifest does not have at least one icon that is maskable',
        validate: ManifestValue => icons.doExist(ManifestValue) &&
            icons.containsMaskableIcon(ManifestValue),
      },
    ];
  }

  /**
   * Returns results of all manifest checks
   * @param {Pick<LH.Artifacts, 'WebAppManifest'|'InstallabilityErrors'>} Manifest
   * @return {Promise<LH.Artifacts.ManifestValues>}
   */
  static async compute_({WebAppManifest, InstallabilityErrors}) {
    // if the manifest isn't there or is invalid json, we report that and bail
    if (WebAppManifest === null) {
      return {
        isParseFailure: true,
        parseFailureReason: 'No manifest was fetched',
        allChecks: [],
      };
    }
    const manifestValue = WebAppManifest.value;
    if (manifestValue === undefined) {
      return {
        isParseFailure: true,
        parseFailureReason: 'Manifest failed to parse as valid JSON',
        allChecks: [],
      };
    }

    // manifest is valid, so do the rest of the checks
    const remainingChecks = ManifestValues.manifestChecks.map(item => {
      return {
        id: item.id,
        failureText: item.failureText,
        passing: item.validate(manifestValue, InstallabilityErrors.errors),
      };
    });

    return {
      isParseFailure: false,
      allChecks: remainingChecks,
    };
  }
}

module.exports = makeComputedArtifact(ManifestValues);
