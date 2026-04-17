/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import WebMcpFormCoverage from '../../audits/webmcp-form-coverage.js';

describe('WebMCP: form-coverage audit', () => {
  it('lists forms that lack WebMCP annotations', () => {
    const artifacts = {
      Inputs: {
        forms: [
          {
            id: 'form1',
            name: 'form1',
            autocomplete: '',
            node: {nodeLabel: 'form', snippet: '<form id="form1">'},
          },
          {
            id: 'form2',
            name: 'form2',
            autocomplete: '',
            webMcpToolname: 'my-tool',
            webMcpTooldescription: 'a test tool',
            node: {nodeLabel: 'form', snippet: '<form id="form2" toolname="my-tool">'},
          },
        ],
        inputs: [],
        labels: [],
      },
    };

    const {score, details, displayValue} = WebMcpFormCoverage.audit(artifacts);

    expect(score).toBe(1);
    expect(displayValue).toBeDisplayString('1 form missing annotations');
    expect(details.type).toBe('table');
    expect(details.items).toHaveLength(1);
    expect(details.items[0]).toMatchObject({
      node: {
        type: 'node',
        nodeLabel: 'form',
        snippet: '<form id="form1">',
      },
    });
  });

  it('empty table if all forms have WebMCP annotations', () => {
    const artifacts = {
      Inputs: {
        forms: [
          {
            id: 'form2',
            name: 'form2',
            autocomplete: '',
            webMcpToolname: 'my-tool',
            webMcpTooldescription: 'a test tool',
            node: {nodeLabel: 'form', snippet: '<form id="form2" toolname="my-tool">'},
          },
        ],
        inputs: [],
        labels: [],
      },
    };

    const {score, details} = WebMcpFormCoverage.audit(artifacts);

    expect(score).toBe(1);
    expect(details).toBeUndefined();
  });

  it('empty table if no forms are found', () => {
    const artifacts = {
      Inputs: {
        forms: [],
        inputs: [],
        labels: [],
      },
    };

    const {score, details} = WebMcpFormCoverage.audit(artifacts);

    expect(score).toBe(1);
    expect(details).toBeUndefined();
  });
});

