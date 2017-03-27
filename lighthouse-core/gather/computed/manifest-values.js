/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const ComputedArtifact = require('./computed-artifact');
const icons = require('../../lib/icons');

const PWA_DISPLAY_VALUES = ['minimal-ui', 'fullscreen', 'standalone'];

// Historically, Chrome recommended 12 chars as the maximum short_name length to prevent truncation.
// See #69 for more discussion & https://developer.chrome.com/apps/manifest/name#short_name
const SUGGESTED_SHORTNAME_LENGTH = 12;

class ManifestValues extends ComputedArtifact {

  get name() {
    return 'ManifestValues';
  }

  static get validityIds() {
    return ['hasManifest', 'hasParseableManifest'];
  }

  static get manifestParsingChecks() {
    return [
      {
        id: 'hasManifest',
        userText: 'Manifest is available',
        toPass: manifest => manifest !== null
      },
      {
        id: 'hasParseableManifest',
        userText: 'Manifest is parsed as valid JSON',
        toPass: manifest => manifest !== null &&
          typeof manifest !== 'undefined' && !!manifest.value
      }
    ];
  }

  static get manifestChecks() {
    return [
      {
        id: 'hasStartUrl',
        userText: 'Manifest contains `start_url`',
        toPass: manifest => !!manifest.value.start_url.value
      },
      {
        id: 'hasIconsAtLeast192px',
        userText: 'Manifest contains icons at least 192px',
        toPass: manifest => icons.doExist(manifest.value) &&
            icons.sizeAtLeast(192, /** @type {!Manifest} */ (manifest.value)).length > 0
      },
      {
        id: 'hasIconsAtLeast512px',
        userText: 'Manifest contains icons at least 512px',
        toPass: manifest => icons.doExist(manifest.value) &&
            icons.sizeAtLeast(512, /** @type {!Manifest} */ (manifest.value)).length > 0
      },
      {
        id: 'hasPWADisplayValue',
        userText: 'Manifest\'s `display` value is one of: ' + PWA_DISPLAY_VALUES.join(' | '),
        toPass: manifest => PWA_DISPLAY_VALUES.includes(manifest.value.display.value)
      },
      {
        id: 'hasBackgroundColor',
        userText: 'Manifest contains `background_color`',
        toPass: manifest => !!manifest.value.background_color.value
      },
      {
        id: 'hasThemeColor',
        userText: 'Manifest contains `theme_color`',
        toPass: manifest => !!manifest.value.theme_color.value
      },
      {
        id: 'hasShortName',
        userText: 'Manifest contains `short_name`',
        toPass: manifest => !!manifest.value.short_name.value
      },
      {
        id: 'shortNameLength',
        userText: 'Manifest `short_name` won\'t be truncated when displayed on the homescreen',
        toPass: manifest => manifest.value.short_name.value &&
            manifest.value.short_name.value.length <= SUGGESTED_SHORTNAME_LENGTH
      },
      {
        id: 'hasName',
        userText: 'Manifest contains `name`',
        toPass: manifest => !!manifest.value.name.value
      }
    ];
  }

  /**
   * Returns results of all manifest checks
   * @param {Manifest} manifest
   * @return {<{isParseFailure: !boolean, parseFailureReason: ?string, allChecks: !Array}>}
   */
  compute_(manifest) {
    // if the manifest isn't there or is invalid json, we report that and bail
    const parsingChecks = ManifestValues.manifestParsingChecks.map(item => {
      item.passing = item.toPass(manifest);
      return item;
    });
    const failingParsingCheck = parsingChecks.find(item => item.passing === false);
    if (failingParsingCheck) {
      return {
        isParseFailure: true,
        parseFailureReason: failingParsingCheck.userText,
        allChecks: []
      };
    }

    // manifest is valid, so do the rest of the checks
    const remainingChecks = ManifestValues.manifestChecks.map(item => {
      item.passing = item.toPass(manifest);
      return item;
    });

    return {
      isParseFailure: false,
      parseFailureReason: undefined,
      allChecks: remainingChecks
    };
  }

}

module.exports = ManifestValues;
