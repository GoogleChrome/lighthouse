/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import WebMcpSchemaValidityAudit from '../../audits/webmcp-schema-validity.js';

describe('WebMcpSchemaValidity audit', () => {
  it('is not applicable when modelContext is not defined', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMCP: {isSupported: false, tools: []},
      WebMcpSchemaIssues: [],
    }, {});
    expect(auditResult.score).toEqual(1);
    expect(auditResult.notApplicable).toEqual(true);
  });

  it('not applicable when no issues and no tools were found', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMCP: {isSupported: true, tools: []},
      WebMcpSchemaIssues: [],
    }, {});
    expect(auditResult.score).toEqual(1);
    expect(auditResult.notApplicable).toEqual(true);
  });

  it('passes when valid tools are found without issues', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMCP: {isSupported: true, tools: [{name: 'tool1'}]},
      WebMcpSchemaIssues: [],
    }, {});
    expect(auditResult.score).toEqual(1);
    expect(auditResult.notApplicable).toEqual(undefined);
  });


  it('fails when WebMCP issues are found', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMCP: {isSupported: true, tools: []},
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

    expect(auditResult.score).toEqual(0);
    expect(auditResult.details.items.length).toEqual(2);
    expect(auditResult.details.items[0].issue.formattedDefault).toEqual(
      'Form level `toolname` attribute is missing. Add it to define the tool name.');
    expect(auditResult.details.items[1].issue.formattedDefault).toEqual(
      'Add a description to make this form more accessible for AI agents.');
  });

  it('deduplicates identical issues on the same node', async () => {
    const auditResult = await WebMcpSchemaValidityAudit.audit({
      WebMCP: {isSupported: true, tools: []},
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

    expect(auditResult.score).toEqual(0.5);
    expect(auditResult.details.items.length).toEqual(2);
    expect(auditResult.details.items[0].issue.formattedDefault).toEqual(
      'Add a description to make this form more accessible for AI agents.');
    expect(auditResult.details.items[1].issue.formattedDefault).toEqual(
      'Missing `name` attribute for an optional field. Add it to define the parameter name.');
  });
});
