/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import WebMCP from '../../../gather/gatherers/webmcp.js';
import {createMockContext} from '../mock-driver.js';

describe('WebMCP Gatherer', () => {
  it('collects tools from events', async () => {
    const gatherer = new WebMCP();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(true);

    const eventData = {
      tools: [
        {
          name: 'new_tool',
          description: 'A new tool',
          inputSchema: {type: 'object'},
          frameId: 'F1',
        },
      ],
    };

    mockContext.driver.defaultSession.on
      .mockEvent('WebMCP.toolsAdded', eventData);

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('WebMCP.enable')
      .mockResponse('WebMCP.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    await new Promise(resolve => setTimeout(resolve, 0));
    await gatherer.stopInstrumentation(mockContext.asContext());

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    // Should have 1 tool from event
    expect(artifact.tools.length).toEqual(1);
    expect(artifact.tools[0].name).toEqual('new_tool');
    expect(artifact.isSupported).toEqual(true);
  });

  it('removes duplicates', async () => {
    const gatherer = new WebMCP();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(true);

    const eventData1 = {
      tools: [
        {
          name: 'tool1',
          description: 'First tool',
          inputSchema: {type: 'object'},
          frameId: 'F1',
        },
      ],
    };

    const eventData2 = {
      tools: [
        {
          name: 'tool1',
          description: 'Duplicate tool',
          inputSchema: {type: 'object'},
          frameId: 'F1',
        },
      ],
    };

    mockContext.driver.defaultSession.on
      .mockEvent('WebMCP.toolsAdded', eventData1)
      .mockEvent('WebMCP.toolsAdded', eventData2);

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('WebMCP.enable')
      .mockResponse('WebMCP.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    await new Promise(resolve => setTimeout(resolve, 0));
    await gatherer.stopInstrumentation(mockContext.asContext());

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    // Should only have 1 tool because of deduplication
    expect(artifact.tools.length).toEqual(1);
    expect(artifact.tools[0].name).toEqual('tool1');
    expect(artifact.tools[0].description).toEqual('Duplicate tool');
  });

  it('removes tools on toolsRemoved event', async () => {
    const gatherer = new WebMCP();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(true);

    const addEventData = {
      tools: [
        {
          name: 'tool_to_remove',
          description: 'A tool to be removed',
          inputSchema: {type: 'object'},
          frameId: 'F1',
        },
      ],
    };

    const removeEventData = {
      tools: [
        {
          name: 'tool_to_remove',
          description: 'A tool to be removed',
          inputSchema: {type: 'object'},
          frameId: 'F1',
        },
      ],
    };

    mockContext.driver.defaultSession.on
      .mockEvent('WebMCP.toolsAdded', addEventData)
      .mockEvent('WebMCP.toolsRemoved', removeEventData);

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('WebMCP.enable')
      .mockResponse('WebMCP.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    await new Promise(resolve => setTimeout(resolve, 0));
    await gatherer.stopInstrumentation(mockContext.asContext());

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    // Should be empty
    expect(artifact.tools.length).toEqual(0);
  });

  it('returns isSupported false when WebMCP.enable fails', async () => {
    const gatherer = new WebMCP();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(true);
    mockContext.driver.defaultSession.sendCommand.mockResponse(
      'WebMCP.enable',
      () => Promise.reject(new Error('\'WebMCP.enable\' wasn\'t found'))
    );

    await gatherer.startInstrumentation(mockContext.asContext());
    const artifact = await gatherer.getArtifact(mockContext.asContext());
    expect(artifact.isSupported).toEqual(false);
    expect(artifact.tools.length).toEqual(0);
  });

  it('returns isSupported false when modelContext is not found', async () => {
    const gatherer = new WebMCP();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(false);
    mockContext.driver.defaultSession.sendCommand.mockResponse('WebMCP.enable');

    await gatherer.startInstrumentation(mockContext.asContext());
    const artifact = await gatherer.getArtifact(mockContext.asContext());
    expect(artifact.isSupported).toEqual(false);
    expect(artifact.tools.length).toEqual(0);
  });

  it('returns empty array when no tools are registered', async () => {
    const gatherer = new WebMCP();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(true);

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('WebMCP.enable')
      .mockResponse('WebMCP.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    await gatherer.stopInstrumentation(mockContext.asContext());

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    expect(artifact.tools.length).toEqual(0);
  });

  it('resolves backendNodeId to nodeDetails', async () => {
    const gatherer = new WebMCP();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(true);

    const eventData = {
      tools: [
        {
          name: 'declarative_tool',
          description: 'A tool with node',
          inputSchema: {type: 'object'},
          frameId: 'F1',
          backendNodeId: 42,
        },
      ],
    };

    mockContext.driver.defaultSession.on
      .mockEvent('WebMCP.toolsAdded', eventData);

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('WebMCP.enable')
      .mockResponse('DOM.resolveNode', {object: {objectId: 'remote-obj-1'}})
      .mockResponse('Runtime.callFunctionOn',
        {result: {value: {snippet: '<form></form>', selector: 'form'}}})
      .mockResponse('WebMCP.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    await new Promise(resolve => setTimeout(resolve, 0));
    await gatherer.stopInstrumentation(mockContext.asContext());

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    expect(artifact.tools.length).toEqual(1);
    expect(artifact.tools[0].name).toEqual('declarative_tool');
    expect(artifact.tools[0].nodeDetails).toEqual({snippet: '<form></form>', selector: 'form'});
  });
});
