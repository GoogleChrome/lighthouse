/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import LlmsTxtAudit from '../../../audits/agentic/llms-txt.js';

describe('Agentic: llms.txt audit', () => {
  it('fails when the network request for /llms.txt fails entirely (no status)', () => {
    // The gatherer returns status: null when the fetch throws (network error).
    const testData = [
      {status: null, content: null},
      {status: 0, content: null},
    ];

    testData.forEach(LlmsTxt => {
      const artifacts = {LlmsTxt};
      const auditResult = LlmsTxtAudit.audit(artifacts);

      assert.equal(auditResult.score, 0);
      expect(auditResult.explanation).toBeDisplayString('Fetch of llms.txt failed');
    });
  });

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
      {
        // ## is an H2 — the regex /^#\s+.+/m requires a single leading #,
        // so this must not satisfy the H1 requirement.
        LlmsTxt: {
          status: 200,
          content: '## Section\nLong enough file with a link [Link](https://example.com) but only an H2.',
        },
        expectedErrors: 1, // Missing H1 only
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

  it('fails when request for /llms.txt is a redirect (3xx)', () => {
    // 3xx responses have no body, so content is null. The audit throws because
    // it has no redirect branch — this documents that known behaviour.
    const testData = [
      {status: 301, content: null},
      {status: 302, content: null},
    ];

    testData.forEach(LlmsTxt => {
      const artifacts = {LlmsTxt};

      assert.throws(
        () => LlmsTxtAudit.audit(artifacts),
        /Status \d+ was valid, but content was null/
      );
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
      {
        status: 200,
        content: `\uFEFF# Title\nLong enough file with a link [Link](https://example.com) after a BOM.`,
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
