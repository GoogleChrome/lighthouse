/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import LlmsTxtAudit from '../../../audits/agentic/llms-txt.js';

describe('Agentic: llms.txt audit', () => {
  it('fails when request for /llms.txt returns a HTTP500+ error', () => {
    const testData = [
      {
        status: 500,
        content: null,
      },
      {
        status: 503,
        content: 'There is some content',
      },
      {
        status: 599,
        content: null,
      },
    ];

    testData.forEach(LlmsTxt => {
      const artifacts = {
        LlmsTxt,
      };

      const auditResult = LlmsTxtAudit.audit(artifacts);
      assert.equal(auditResult.score, 0);
    });
  });

  it('fails when llms.txt file is missing required elements', () => {
    const testData = [
      {
        LlmsTxt: {
          status: 200,
          content: 'Long enough file with a link [Link](https://example.com) but no H1.',
        },
        expectedErrors: 1, // Missing H1
      },
      {
        LlmsTxt: {
          status: 200,
          content: '# Title\nThis file is long enough and has an H1 header but no links.',
        },
        expectedErrors: 1, // Missing links
      },
      {
        LlmsTxt: {
          status: 200,
          content: '# Title\n[Link](url)',
        },
        expectedErrors: 1, // Too short
      },
      {
        LlmsTxt: {
          status: 200,
          content: 'Short text with no H1 and no links',
        },
        expectedErrors: 3, // Missing H1, Missing links, Too short
      },
      {
        LlmsTxt: {
          status: 200,
          content: '',
        },
        expectedErrors: 3, // Missing H1, Missing links, Too short
      },
    ];

    testData.forEach(({LlmsTxt, expectedErrors}) => {
      const artifacts = {
        LlmsTxt,
      };

      const auditResult = LlmsTxtAudit.audit(artifacts);

      assert.equal(auditResult.score, 0);
      assert.equal(auditResult.details.items.length, expectedErrors);
    });
  });

  it('not applicable when there is no llms.txt', () => {
    const testData = [
      {
        status: 404,
        content: 'invalid content',
      },
      {
        status: 401,
        content: 'invalid content',
      },
    ];

    testData.forEach(LlmsTxt => {
      const artifacts = {
        LlmsTxt,
      };

      const auditResult = LlmsTxtAudit.audit(artifacts);
      assert.equal(auditResult.score, 1);
      assert.equal(auditResult.notApplicable, true);
    });
  });

  it('passes when llms.txt is valid Markdown', () => {
    const testData = [
      {
        status: 200,
        content: `# Title\nLong enough file with a link [Link](https://example.com) to pass.`,
      },
      {
        status: 201,
        content: `# Another Title\n\nLong enough with a link [Link](https://example.com) as required.`,
      },
      {
        status: 200,
        content: `
# Title with spacing

This content is long enough to pass the length check and has a link [Here](https://example.com).
`,
      },
    ];

    testData.forEach(LlmsTxt => {
      const artifacts = {
        LlmsTxt,
      };

      const auditResult = LlmsTxtAudit.audit(artifacts);
      assert.equal(auditResult.score, 1);
    });
  });
});
