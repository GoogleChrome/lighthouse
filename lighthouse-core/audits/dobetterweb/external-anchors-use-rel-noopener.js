/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../../lib/url-shim.js');
const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the cross-origin links that the web page contains, and whether the links can be considered safe. This descriptive title is shown to users when all links are safe. */
  title: 'Links to cross-origin destinations are safe',
  /** Title of a Lighthouse audit that provides detail on the cross-origin links that the web page contains, and whether the links can be considered safe. This descriptive title is shown to users when not all links can be considered safe. */
  failureTitle: 'Links to cross-origin destinations are unsafe',
  /** Description of a Lighthouse audit that tells the user why and how they should secure cross-origin links. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Add `rel="noopener"` or `rel="noreferrer"` to any external links to improve ' +
    'performance and prevent security vulnerabilities. ' +
    '[Learn more](https://web.dev/external-anchors-use-rel-noopener).',
  /**
   * @description Warning that some links' destinations cannot be determined and therefore the audit cannot evaluate the link's safety.
   * @example {<a target="_blank">} anchorHTML
   */
  warning: 'Unable to determine the destination for anchor ({anchorHTML}). ' +
    'If not used as a hyperlink, consider removing target=_blank.',
  /** Label for a column in a data table; entries will be the HTML elements that failed the audit. Anchors are DOM elements that are links. */
  columnFailingAnchors: 'Failing Anchors',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ExternalAnchorsUseRelNoopenerAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'external-anchors-use-rel-noopener',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['URL', 'AnchorElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    /** @type {string[]} */
    const warnings = [];
    const pageHost = new URL(artifacts.URL.finalUrl).host;
    const failingAnchors = artifacts.AnchorElements
      .filter(anchor => anchor.target === '_blank' && !anchor.rel.includes('noopener') &&
        !anchor.rel.includes('noreferrer'))
    // Filter usages to exclude anchors that are same origin
      .filter(anchor => {
        try {
          return new URL(anchor.href).host !== pageHost;
        } catch (err) {
          warnings.push(str_(UIStrings.warning, {anchorHTML: anchor.outerHTML}));
          return true;
        }
      })
      .filter(anchor => {
        return !anchor.href || anchor.href.toLowerCase().startsWith('http');
      })
      .map(anchor => {
        return {
          node: /** @type {LH.Audit.Details.NodeValue} */  ({
            type: 'node',
            path: anchor.devtoolsNodePath || '',
            selector: anchor.selector || '',
            nodeLabel: anchor.nodeLabel || '',
            snippet: anchor.outerHTML || '',
          }),
          href: anchor.href || 'Unknown',
          target: anchor.target || '',
          rel: anchor.rel || '',
          outerHTML: anchor.outerHTML || '',
        };
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(UIStrings.columnFailingAnchors)},
    ];

    const details = Audit.makeTableDetails(headings, failingAnchors);

    return {
      score: Number(failingAnchors.length === 0),
      extendedInfo: {
        value: failingAnchors,
      },
      details,
      warnings,
    };
  }
}

module.exports = ExternalAnchorsUseRelNoopenerAudit;
module.exports.UIStrings = UIStrings;
