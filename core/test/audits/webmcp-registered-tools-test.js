/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import WebMCPRegisteredTools from '../../audits/webmcp-registered-tools.js';

describe('WebMCPRegisteredTools Audit', () => {
  it('renders a table with registered tools', async () => {
    const artifacts = {
      WebMCP: {
        isSupported: true,
        tools: [
          {
            name: 'book_table_le_petit_bistro',
            description: 'Creates a confirmed dining reservation at Le Petit Bistro.',
            inputSchema: {
              type: 'object',
              properties: {
                name: {type: 'string'},
              },
            },
            frameId: 'F9F2B9BAF7F692B8EBEF6C0332C423C4',
            backendNodeId: 1,
            nodeDetails: {
              lhId: 'node-1',
              devtoolsNodePath: '1,HTML,1,BODY,0,DIV',
              selector: 'div#reservation',
              boundingRect: {top: 0, left: 0, width: 100, height: 100},
              snippet: '<div id="reservation">',
              nodeLabel: 'Reservation Div',
            },
          },
          {
            name: 'get_weather',
            description: 'Get current weather.',
            inputSchema: {
              type: 'object',
              properties: {
                location: {type: 'string'},
              },
            },
            frameId: 'F9F2B9BAF7F692B8EBEF6C0332C423C4',
            stackTrace: {
              callFrames: [{url: 'https://example.com/mcp.js', lineNumber: 34}],
            },
          },
        ],
      },
    };

    const result = await WebMCPRegisteredTools.audit(artifacts);

    expect(result.score).toEqual(1);
    expect(result.details.items).toHaveLength(2);

    // Verify Imperative Tools section
    expect(result.details.items[0].title.formattedDefault).toEqual('Imperative Tools');
    expect(result.details.items[0].value.items).toHaveLength(1);
    expect(result.details.items[0].value.items[0]).toMatchObject({
      tool: 'get_weather',
      description: 'Get current weather.',
      source: {
        type: 'source-location',
        url: 'https://example.com/mcp.js',
        line: 34,
        column: 0,
        urlProvider: 'network',
      },
    });

    // Verify Declarative Tools section
    expect(result.details.items[1].title.formattedDefault).toEqual('Declarative Tools');
    expect(result.details.items[1].value.items).toHaveLength(1);
    expect(result.details.items[1].value.items[0]).toMatchObject({
      tool: 'book_table_le_petit_bistro',
      description: 'Creates a confirmed dining reservation at Le Petit Bistro.',
      element: {
        type: 'node',
        lhId: 'node-1',
        path: '1,HTML,1,BODY,0,DIV',
        selector: 'div#reservation',
        boundingRect: {top: 0, left: 0, width: 100, height: 100},
        snippet: '<div id="reservation">',
        nodeLabel: 'Reservation Div',
      },
    });
  });

  it('handles empty tools list', async () => {
    const artifacts = {
      WebMCP: {isSupported: true, tools: []},
    };

    const result = await WebMCPRegisteredTools.audit(artifacts);

    expect(result.score).toEqual(1);
    expect(result.details).toBeUndefined();
  });

  it('is not applicable when webmcp not supported', async () => {
    const artifacts = {
      WebMCP: {isSupported: false, tools: []},
    };

    const result = await WebMCPRegisteredTools.audit(artifacts);

    expect(result.score).toEqual(1);
    expect(result.notApplicable).toEqual(true);
  });
});
