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
  agenticBrowsingCategoryDescription: 'These checks ensure high-quality, browsable ' +
  'websites for AI agents and validate the correctness of WebMCP integrations. ' +
  'This category is still under development and subject to change.',
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
    'agentic/agent-accessibility-tree',
    'webmcp-registered-tools',
    'webmcp-form-coverage',
    'webmcp-schema-validity',
    'agentic/llms-txt',
  ],
  artifacts: [
    {id: 'WebMCP', gatherer: 'webmcp'},
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
        {id: 'agent-accessibility-tree', weight: 1, group: 'agent-accessibility'},
        {id: 'webmcp-form-coverage', weight: 1, group: 'webmcp'},
        {id: 'webmcp-registered-tools', weight: 1, group: 'webmcp'},
        {id: 'webmcp-schema-validity', weight: 1, group: 'webmcp'},
        {id: 'cumulative-layout-shift', weight: 1, acronym: 'CLS'},
        {id: 'llms-txt', weight: 1, group: 'agent-accessibility'},
      ],
    },
  },
};

export default config;
export {UIStrings};
