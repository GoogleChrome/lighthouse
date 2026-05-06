/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import agenticBrowsingConfig from '../../../../core/config/agentic-browsing-config.js';

/**
 * Config to run only the agentic browsing category.
 * We use the full agenticBrowsingConfig as the base since it defines the category.
 * @type {LH.Config}
 */
const config = {
  ...agenticBrowsingConfig,
  settings: {
    onlyCategories: [
      'agentic-browsing',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/webmcp/webmcp_tester.html',
    finalDisplayedUrl: 'http://localhost:10200/webmcp/webmcp_tester.html',
    categories: {
      'agentic-browsing': {
        title: 'Agentic Browsing',
      },
    },
    audits: {
      // 1. Registered Tools Audit
      // Verifies that the declarative tool is successfully registered and listed.
      'webmcp-registered-tools': {
        score: 1,
        details: {
          items: [
            {
              value: {
                items: [
                  {
                    tool: 'declarative_search',
                    description: 'Search catalog for items.',
                  },
                ],
              },
            },
          ],
        },
      },
      // 2. Form Coverage Audit
      // Should flag 'unannotated-form' (form without WebMCP).
      'webmcp-form-coverage': {
        score: 1, // Informative, so always 1
        details: {
          items: [
            {
              node: {
                selector: 'body > form#unannotated-form',
              },
            },
          ],
        },
      },
      // 3. Schema Validity Audit
      // Currently passes (score 1) because the experimental browser does not yet
      // reliably emit Audits.issueAdded events for all schema violations in this headless context.
      'webmcp-schema-validity': {
        score: 1,
      },
    },
  },
};

export default {
  id: 'webmcp',
  config,
  expectations,
  testRunnerOptions: {
    chromeFlags: '--enable-features=WebMCPTesting',
  },
};
