/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Base class for all aXe audits. Provides a consistent way to
 * generate audit results using aXe rule names.
 */

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Label of a table column that identifies HTML elements that have failed an audit. */
  failingElementsHeader: 'Failing Elements',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class AxeAudit extends Audit {
  /**
   * Base class for audit rules which reflect assessment performed by the aXe accessibility library
   * See https://github.com/dequelabs/axe-core/blob/6b444546cff492a62a70a74a8fc3c62bd4729400/doc/API.md#results-object for result type and format details
   *
   * @param {LH.Artifacts} artifacts Accessibility gatherer artifacts. Note that AxeAudit
   * expects the meta name for the class to match the rule id from aXe.
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    // Indicate if a test is not applicable.
    // This means aXe did not find any nodes which matched these checks.
    // Note in Lighthouse we use the phrasing "Not Applicable" (aXe uses "inapplicable", which sounds weird).
    const notApplicables = artifacts.Accessibility.notApplicable || [];
    const isNotApplicable = notApplicables.find(result => result.id === this.meta.id);
    if (isNotApplicable) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    // Detect errors reported within aXe 'incomplete' results
    // aXe uses this result type to indicate errors, or rules which require manual investigation
    // If aXe reports an error, then bubble it up to the caller
    const incomplete = artifacts.Accessibility.incomplete || [];
    const incompleteResult = incomplete.find(result => result.id === this.meta.id);
    if (incompleteResult && incompleteResult.error) {
      return {
        score: null,
        errorMessage: `axe-core Error: ${incompleteResult.error.message || 'Unknown error'}`,
      };
    }

    const isInformative = this.meta.scoreDisplayMode === Audit.SCORING_MODES.INFORMATIVE;
    const violations = artifacts.Accessibility.violations || [];
    const failureCases = isInformative ? violations.concat(incomplete) : violations;
    const rule = failureCases.find(result => result.id === this.meta.id);
    const impact = rule && rule.impact;
    const tags = rule && rule.tags;

    // Handle absence of aXe failure results for informative rules as 'not applicable'
    // This scenario indicates that no action is required by the web property owner
    // Since there is no score impact from informative rules, display the rule as not applicable
    if (isInformative && !rule) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    /** @type {LH.Audit.Details.Table['items']}>} */
    let items = [];
    if (rule && rule.nodes) {
      items = rule.nodes.map(node => ({
        node: /** @type {LH.Audit.Details.NodeValue} */ ({
          type: 'node',
          selector: Array.isArray(node.target) ? node.target.join(' ') : '',
          path: node.path,
          snippet: node.html || node.snippet,
          explanation: node.failureSummary,
          nodeLabel: node.nodeLabel,
        }),
      }));
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(UIStrings.failingElementsHeader)},
    ];

    /** @type {LH.Audit.Details.DebugData|undefined} */
    let debugData;
    if (impact || tags) {
      debugData = {
        type: 'debugdata',
        impact,
        tags,
      };
    }

    return {
      score: Number(rule === undefined),
      extendedInfo: {
        value: rule,
      },
      details: {...Audit.makeTableDetails(headings, items), debugData},
    };
  }
}

module.exports = AxeAudit;
module.exports.UIStrings = UIStrings;
