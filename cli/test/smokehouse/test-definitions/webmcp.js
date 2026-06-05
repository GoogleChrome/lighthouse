/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'webmcp-registered-tools',
      'webmcp-form-coverage',
      'webmcp-schema-validity',
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
    chromeFlags: '--enable-features=WebMCPTesting,DevToolsWebMCPSupport',
  },
};
