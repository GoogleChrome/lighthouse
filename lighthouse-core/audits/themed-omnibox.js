/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit.js');
const ManifestValues = require('../computed/manifest-values.js');
const cssParsers = require('cssstyle/lib/parsers');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the theme color the web page has set for the browser's address bar. This descriptive title is shown to users when an address-bar theme color has been set. */
  title: 'Sets a theme color for the address bar.',
  /** Title of a Lighthouse audit that provides detail on the theme color the web page has set for the browser's address bar. This descriptive title is shown to users when an address-bar theme color has not been set. */
  failureTitle: 'Does not set a theme color for the address bar.',
  /** Description of a Lighthouse audit that tells the user why they should set a theme color for the browser's address bar. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'The browser address bar can be themed to match your site. ' +
    '[Learn more](https://web.dev/themed-omnibox).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview
 * Audits if a page is configured for a themed address bar
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has a valid theme_color
 *   * HTML has a valid theme-color meta
 */

class ThemedOmnibox extends MultiCheckAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'themed-omnibox',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['WebAppManifest', 'InstallabilityErrors', 'MetaElements'],
    };
  }

  /**
   * @param {string} color
   * @return {boolean}
   */
  static isValidColor(color) {
    return cssParsers.valueType(color) === cssParsers.TYPES.COLOR;
  }

  /**
   * @param {LH.Artifacts.MetaElement|undefined} themeColorMeta
   * @param {Array<string>} failures
   */
  static assessMetaThemecolor(themeColorMeta, failures) {
    if (!themeColorMeta) {
      // TODO(#7238): i18n
      failures.push('No `<meta name="theme-color">` tag found');
    } else if (!ThemedOmnibox.isValidColor(themeColorMeta.content || '')) {
      failures.push('The theme-color meta tag did not contain a valid CSS color');
    }
  }

  /**
   * @param {LH.Artifacts.ManifestValues} manifestValues
   * @param {Array<string>} failures
   */
  static assessManifest(manifestValues, failures) {
    if (manifestValues.isParseFailure && manifestValues.parseFailureReason) {
      failures.push(manifestValues.parseFailureReason);
      return;
    }

    const themeColorCheck = manifestValues.allChecks.find(i => i.id === 'hasThemeColor');
    if (themeColorCheck && !themeColorCheck.passing) {
      failures.push(themeColorCheck.failureText);
    }
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{failures: Array<string>, manifestValues: LH.Artifacts.ManifestValues, themeColor: ?string}>}
   */
  static async audit_(artifacts, context) {
    /** @type {Array<string>} */
    const failures = [];

    const themeColorMeta = artifacts.MetaElements.find(meta => meta.name === 'theme-color');
    const manifestValues = await ManifestValues.request(artifacts, context);
    ThemedOmnibox.assessManifest(manifestValues, failures);
    ThemedOmnibox.assessMetaThemecolor(themeColorMeta, failures);

    return {
      failures,
      manifestValues,
      themeColor: (themeColorMeta && themeColorMeta.content) || null,
    };
  }
}

module.exports = ThemedOmnibox;
module.exports.UIStrings = UIStrings;
