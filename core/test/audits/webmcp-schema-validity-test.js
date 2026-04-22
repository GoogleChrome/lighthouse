/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import WebMcpSchemaValidityAudit from '../../audits/webmcp-schema-validity.js';

describe('WebMcpSchemaValidity audit', () => {
  it('passes when no issues were found (not applicable)', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMCPTools: [],
      WebMcpSchemaIssues: [],
    }, {});
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.notApplicable, true);
  });

  it('passes when valid tools are found without issues', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMCPTools: [{name: 'tool1'}],
      WebMcpSchemaIssues: [],
    }, {});
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.notApplicable, undefined);
  });


  it('fails when WebMCP issues are found', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMcpSchemaIssues: [
        {
          errorType: 'FormModelContextParameterMissingTitleAndDescription',
          violatingNodeId: 1,
          nodeDetails: {nodeName: 'INPUT', selector: '#input1'},
        },
        {
          errorType: 'FormModelContextMissingToolName',
          violatingNodeId: 2,
          nodeDetails: {nodeName: 'FORM', selector: '#form1'},
        },
      ],
    }, {});

    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 2);
    assert.equal(auditResult.details.items[0].issue.formattedDefault,
      'Form level `toolname` attribute is missing. Add it to define the tool name.');
    assert.equal(auditResult.details.items[1].issue.formattedDefault,
      'Add a description to make this form more accessible for AI agents.');
  });

  it('deduplicates identical issues on the same node', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMcpSchemaIssues: [
        {
          errorType: 'FormModelContextParameterMissingTitleAndDescription',
          violatingNodeId: 1,
          nodeDetails: {nodeName: 'INPUT', selector: '#input1'},
        },
        {
          errorType: 'FormModelContextParameterMissingTitleAndDescription',
          violatingNodeId: 1,
          nodeDetails: {nodeName: 'INPUT', selector: '#input1'},
        },
        {
          errorType: 'FormModelContextParameterMissingName',
          violatingNodeId: 1,
          nodeDetails: {nodeName: 'INPUT', selector: '#input1'},
        },
      ],
    }, {});

    assert.equal(auditResult.score, 0.5);
    assert.equal(auditResult.details.items.length, 2);
    assert.equal(auditResult.details.items[0].issue.formattedDefault,
      'Add a description to make this form more accessible for AI agents.');
    assert.equal(auditResult.details.items[1].issue.formattedDefault,
      'Missing `name` attribute for an optional field. Add it to define the parameter name.');
  });
});
