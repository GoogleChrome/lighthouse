/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of the Agentic Browsing category of audits. */
  agenticBrowsingCategoryTitle: 'Agentic Browsing',
  /** Description of the Agentic Browsing category. */
  agenticBrowsingCategoryDescription: 'These checks ensure high-quality, ' +
  'browsable websites for AI agents and validate the correctness of WebMCP integrations.',
  /** Title of the WebMCP group of audits. */
  webmcpGroupTitle: 'WebMCP',
  /** Description of the WebMCP group. */
  webmcpGroupDescription: 'Audits validating WebMCP integration.',
  /** Title of the Agent Accessibility group of audits. */
  agentAccessibilityGroupTitle: 'Agent Accessibility',
  /** Description of the Agent Accessibility group of audits. */
  agentAccessibilityGroupDescription: 'These audits highlight best practices for improving the ' +
  'accessibility of the website for AI agents.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  audits: [
    'webmcp-registered-tools',
    'webmcp-form-coverage',
    'webmcp-schema-validity',
    'agentic/llms-txt',
  ],
  artifacts: [
    {id: 'WebMCPTools', gatherer: 'webmcp-tools'},
    {id: 'WebMcpSchemaIssues', gatherer: 'webmcp-schema'},
    {id: 'LlmsTxt', gatherer: 'agentic/llms-txt'},
  ],
  groups: {
    'webmcp': {
      title: str_(UIStrings.webmcpGroupTitle),
      description: str_(UIStrings.webmcpGroupDescription),
    },
    'agent-accessibility': {
      title: str_(UIStrings.agentAccessibilityGroupTitle),
      description: str_(UIStrings.agentAccessibilityGroupDescription),
    },
  },
  categories: {
    'agentic-browsing': {
      title: str_(UIStrings.agenticBrowsingCategoryTitle),
      description: str_(UIStrings.agenticBrowsingCategoryDescription),
      supportedModes: ['navigation', 'snapshot'],
      categoryScoreDisplayMode: 'fraction',
      auditRefs: [
        {id: 'webmcp-form-coverage', weight: 1, group: 'webmcp'},
        {id: 'webmcp-registered-tools', weight: 1, group: 'webmcp'},
        {id: 'webmcp-schema-validity', weight: 1, group: 'webmcp'},
        {id: 'cumulative-layout-shift', weight: 1, acronym: 'CLS'},
        {id: 'button-name', weight: 1, group: 'agent-accessibility'},
        {id: 'input-button-name', weight: 1, group: 'agent-accessibility'},
        {id: 'input-image-alt', weight: 1, group: 'agent-accessibility'},
        {id: 'label', weight: 1, group: 'agent-accessibility'},
        {id: 'link-name', weight: 1, group: 'agent-accessibility'},
        {id: 'select-name', weight: 1, group: 'agent-accessibility'},
        {id: 'document-title', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-allowed-attr', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-allowed-role', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-command-name', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-conditional-attr', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-dialog-name', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-hidden-body', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-hidden-focus', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-input-field-name', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-prohibited-attr', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-required-attr', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-required-children', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-required-parent', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-roles', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-text', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-toggle-field-name', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-tooltip-name', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-treeitem-name', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-valid-attr', weight: 1, group: 'agent-accessibility'},
        {id: 'aria-valid-attr-value', weight: 1, group: 'agent-accessibility'},
        {id: 'duplicate-id-aria', weight: 1, group: 'agent-accessibility'},
        {id: 'definition-list', weight: 1, group: 'agent-accessibility'},
        {id: 'table-duplicate-name', weight: 1, group: 'agent-accessibility'},
        {id: 'tabindex', weight: 1, group: 'agent-accessibility'},
        {id: 'autocomplete-valid', weight: 1, group: 'agent-accessibility'},
        {id: 'presentation-role-conflict', weight: 1, group: 'agent-accessibility'},
        {id: 'svg-img-alt', weight: 1, group: 'agent-accessibility'},
        {id: 'llms-txt', weight: 1, group: 'agent-accessibility'},
      ],
    },
  },
};

export default config;
export {UIStrings};
