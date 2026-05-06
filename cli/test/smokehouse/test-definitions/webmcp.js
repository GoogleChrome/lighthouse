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
      // Verifies that both declarative forms are successfully registered.
      'webmcp-registered-tools': {
        score: 1,
        details: {
          items: [
            {
              title: 'Declarative Tools',
              value: {
                items: [
                  {
                    tool: 'declarative_search',
                    description: 'Search catalog for items.',
                  },
                  {
                    tool: 'declarative_feedback',
                    description: 'Submit feedback to us.',
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
      // Should flag 'declarative_feedback' because its input is missing 'toolparamdescription'.
      // A warning-severity issue results in a score of 0.5 (partial pass).
      'webmcp-schema-validity': {
        score: 0.5,
        details: {
          items: [
            {
              element: {
                selector: 'body > form#invalid-declarative-form > input',
              },
              issue: 'Add a description to make this form more accessible for AI agents.',
            },
          ],
        },
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
