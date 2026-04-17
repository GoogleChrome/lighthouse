/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import WebMCPToolsGatherer from '../../../gather/gatherers/webmcp-tools.js';
import {createMockContext} from '../mock-driver.js';

describe('WebMCPTools Gatherer', () => {
  it('collects tools from events', async () => {
    const gatherer = new WebMCPToolsGatherer();
    const mockContext = createMockContext();
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
    // Wait for event to fire (createMockOnFn uses setTimeout)
    await new Promise(resolve => setTimeout(resolve, 0));
    await gatherer.stopInstrumentation(mockContext.asContext());

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    // Should have 1 tool from event
    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].name, 'new_tool');
  });

  it('removes duplicates', async () => {
    const gatherer = new WebMCPToolsGatherer();
    const mockContext = createMockContext();

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
    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].name, 'tool1');
    assert.equal(artifact[0].description, 'Duplicate tool');
  });

  it('removes tools on toolsRemoved event', async () => {
    const gatherer = new WebMCPToolsGatherer();
    const mockContext = createMockContext();

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
    assert.equal(artifact.length, 0);
  });

  it('handles error on enable', async () => {
    const gatherer = new WebMCPToolsGatherer();
    const mockContext = createMockContext();

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('WebMCP.enable', () =>
        Promise.reject(new Error('Protocol error: WebMCP.enable not found')));

    try {
      await gatherer.startInstrumentation(mockContext.asContext());
      assert.fail('Should have thrown an error');
    } catch (e) {
      assert.equal(e.message, 'Protocol error: WebMCP.enable not found');
    }
  });

  it('returns empty array when no tools are registered', async () => {
    const gatherer = new WebMCPToolsGatherer();
    const mockContext = createMockContext();

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('WebMCP.enable')
      .mockResponse('WebMCP.disable');

    await gatherer.startInstrumentation(mockContext.asContext());
    await gatherer.stopInstrumentation(mockContext.asContext());

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    assert.equal(artifact.length, 0);
  });

  it('resolves backendNodeId to nodeDetails', async () => {
    const gatherer = new WebMCPToolsGatherer();
    const mockContext = createMockContext();

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

    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].name, 'declarative_tool');
    assert.deepEqual(artifact[0].nodeDetails, {snippet: '<form></form>', selector: 'form'});
  });
});
