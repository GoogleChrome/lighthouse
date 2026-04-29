/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title shown when all agent accessibility checks pass. */
  title: 'Accessibility tree is well-formed',
  /** Title shown when one or more agent accessibility checks fail. */
  failureTitle: 'Accessibility tree is not well-formed',
  /** Description of a Lighthouse audit that tells the user *why* they need a well-formed accessibility tree. */
  description: 'A well-formed accessibility tree helps AI agents to ' +
    'navigate and interact with the page.',
  /** Label of a table column that identifies the accessibility rule that failed. */
  columnRule: 'Failing Rule',
  /** Label of a table column that identifies the HTML element that failed the rule. */
  columnElement: 'Failing Element',
  /** Title of the section containing failed accessibility checks. */
  failedSectionTitle: 'Failed Audits',
  /** Message shown when all accessibility checks pass. */
  displayValuePassed: 'All audits passed',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const TARGET_RULES = new Set([
  'button-name',
  'input-button-name',
  'input-image-alt',
  'label',
  'link-name',
  'select-name',
  'document-title',
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-command-name',
  'aria-conditional-attr',
  'aria-dialog-name',
  'aria-hidden-body',
  'aria-hidden-focus',
  'aria-input-field-name',
  'aria-prohibited-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-text',
  'aria-toggle-field-name',
  'aria-tooltip-name',
  'aria-treeitem-name',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'duplicate-id-aria',
  'definition-list',
  'table-duplicate-name',
  'tabindex',
  'autocomplete-valid',
  'presentation-role-conflict',
  'svg-img-alt',
]);

class AgentAccessibilityTree extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'agent-accessibility-tree',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const violations = (artifacts.Accessibility && artifacts.Accessibility.violations) || [];
    const failedRules = violations.filter(v => TARGET_RULES.has(v.id));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'description', valueType: 'text', label: str_(i18n.UIStrings.columnDescription)},
      {key: 'node', valueType: 'node', label: str_(UIStrings.columnElement)},
    ];

    const items = failedRules.map(rule => ({
      description: rule.help || rule.description,
      node: rule.nodes?.[0] ? Audit.makeNodeItem(rule.nodes[0].node) : undefined,
    }));

    const listItems = [];

    if (items.length > 0) {
      const table = Audit.makeTableDetails(headings, items);
      listItems.push(Audit.makeListDetailSectionItem(table, str_(UIStrings.failedSectionTitle)));
    }

    return {
      score: Number(items.length === 0),
      details: listItems.length > 0 ? Audit.makeListDetails(listItems) : undefined,
      displayValue: items.length === 0 ? str_(UIStrings.displayValuePassed) : undefined,
    };
  }
}

export default AgentAccessibilityTree;
export {UIStrings};
