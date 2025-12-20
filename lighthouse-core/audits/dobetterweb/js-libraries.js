/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Diagnostic audit that lists all JavaScript libraries detected on the page
 */

'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the Javascript libraries that are used on the page. */
  title: 'Detected JavaScript libraries',
  /** Description of a Lighthouse audit that tells the user what this audit is detecting. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'All front-end JavaScript libraries detected on the page. [Learn more](https://web.dev/js-libraries).',
  /** Label for a column in a data table; entries will be the version numbers of the detected Javascript libraries.  */
  columnVersion: 'Version',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class JsLibrariesAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'js-libraries',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Stacks'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const libDetails = artifacts.Stacks
      .filter(stack => stack.detector === 'js')
      // Don't show the fast paths in the table.
      .filter(stack => !stack.id.endsWith('-fast'))
      .map(stack => ({
        name: stack.name,
        version: stack.version,
        npm: stack.npm,
      }));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'name', itemType: 'text', text: str_(i18n.UIStrings.columnName)},
      {key: 'version', itemType: 'text', text: str_(UIStrings.columnVersion)},
    ];
    const details = Audit.makeTableDetails(headings, libDetails, {});

    const debugData = {
      type: /** @type {'debugdata'} */ ('debugdata'),
      stacks: artifacts.Stacks.map(stack => {
        return {
          id: stack.id,
          version: stack.version,
        };
      }),
    };

    return {
      score: 1, // Always pass for now.
      details: {
        ...details,
        debugData,
      },
    };
  }
}

module.exports = JsLibrariesAudit;
module.exports.UIStrings = UIStrings;
