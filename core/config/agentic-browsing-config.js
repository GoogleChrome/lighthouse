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
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  audits: [
    'webmcp-registered-tools',
  ],
  artifacts: [
    {id: 'WebMCPTools', gatherer: 'webmcp-tools'},
  ],
  groups: {
    'webmcp': {
      title: str_(UIStrings.webmcpGroupTitle),
      description: str_(UIStrings.webmcpGroupDescription),
    },
  },
  categories: {
    'agentic-browsing': {
      title: str_(UIStrings.agenticBrowsingCategoryTitle),
      description: str_(UIStrings.agenticBrowsingCategoryDescription),
      supportedModes: ['navigation', 'snapshot'],
      categoryScoreDisplayMode: 'fraction',
      auditRefs: [
        {id: 'webmcp-registered-tools', weight: 1, group: 'webmcp'},
        {id: 'cumulative-layout-shift', weight: 1, acronym: 'CLS'},
      ],
    },
  },
};

export default config;
export {UIStrings};
