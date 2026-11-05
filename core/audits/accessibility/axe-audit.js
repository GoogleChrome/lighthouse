/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Base class for all aXe audits. Provides a consistent way to
 * generate audit results using aXe rule names.
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Label of a table column that identifies HTML elements that have failed an audit. */
  failingElementsHeader: 'Failing Elements',
  /** Label for elements that require manual accessibility review. */
  manualReviewElementsHeader: 'Elements to manually review',
  /** Heading for confirmed accessibility violations. */
  violationsSection: 'Accessibility violations',
  /** Heading for accessibility checks that require manual review. */
  manualReviewSection: 'Needs manual review',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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
        score: null,
        notApplicable: true,
      };
    }

    // Detect errors reported within aXe 'incomplete' results
    // aXe uses this result type to indicate errors, or rules which require manual investigation
    // If aXe reports an error, then bubble it up to the caller
    const incomplete = artifacts.Accessibility.incomplete || [];
    const incompleteResult = incomplete.find(result => result.id === this.meta.id);
    if (incompleteResult?.error) {
      return {
        score: null,
        errorMessage: `axe-core Error: ${incompleteResult.error.message || 'Unknown error'}`,
      };
    }

    const isInformative = this.meta.scoreDisplayMode === Audit.SCORING_MODES.INFORMATIVE;
    const violation = (artifacts.Accessibility.violations || [])
        .find(result => result.id === this.meta.id);
    const rule = violation || incompleteResult;
    const impact = rule?.impact;
    const tags = rule?.tags;

    if (isInformative && !rule) {
      return {score: null, notApplicable: true};
    }

    /** @param {LH.Artifacts.AxeRuleResult|undefined} axeRule
     * @param {boolean} manual
     * @return {LH.Audit.Details.Table}
     */
    const makeTable = (axeRule, manual) => {
      /** @type {LH.Audit.Details.Table['items']} */
      const items = (axeRule?.nodes || []).map(axeNode => ({
        node: {
          ...Audit.makeNodeItem(axeNode.node),
          explanation: axeNode.failureSummary,
        },
        subItems: axeNode.relatedNodes.length ? {
          type: 'subitems',
          items: axeNode.relatedNodes.map(node => ({relatedNode: Audit.makeNodeItem(node)})),
        } : undefined,
      }));
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [{
        key: 'node', valueType: 'node', subItemsHeading: {key: 'relatedNode', valueType: 'node'},
        label: str_(manual ? UIStrings.manualReviewElementsHeader :
          UIStrings.failingElementsHeader),
      }];
      return Audit.makeTableDetails(headings, items);
    };

    /** @type {LH.Audit.Details.DebugData|undefined} */
    let debugData;
    if (impact || tags) {
      debugData = {type: 'debugdata', impact, tags};
    }

    if (violation && incompleteResult) {
      return {
        score: 0,
        displayValue: str_(UIStrings.manualReviewSection),
        details: {
          ...Audit.makeListDetails([
            Audit.makeListDetailSectionItem(
              makeTable(violation, false), str_(UIStrings.violationsSection)),
            Audit.makeListDetailSectionItem(
              makeTable(incompleteResult, true), str_(UIStrings.manualReviewSection)),
          ]),
          debugData,
        },
      };
    }

    return {
      score: Number(rule === undefined),
      displayValue: incompleteResult ? str_(UIStrings.manualReviewSection) : undefined,
      scoreDisplayMode: !violation && incompleteResult ?
        Audit.SCORING_MODES.INFORMATIVE : undefined,
      details: {...makeTable(rule, Boolean(incompleteResult)), debugData},
    };
  }
}

export default AxeAudit;
export {UIStrings};
