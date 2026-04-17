/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import WebMcpSchemaIssues from '../../../gather/gatherers/webmcp-schema.js';

describe('WebMcpSchemaIssues Gatherer', () => {
  it('collects WebMCP issues and resolves node IDs', async () => {
    const gatherer = new WebMcpSchemaIssues();

    // Mock the session
    const mockSession = /** @type {any} */ ({
      on: (/** @type {string} */ event, /** @type {Function} */ handler) => {
        // Store the handler to simulate events
        if (event === 'Audits.issueAdded') {
          mockSession._issueHandler = handler;
        }
      },
      off: () => {},
      sendCommand: async (/** @type {string} */ command, /** @type {any} */ _) => {
        if (command === 'Audits.enable') return {};
        if (command === 'DOM.resolveNode') return {object: {objectId: 'obj1'}};
        if (command === 'Runtime.callFunctionOn') {
          return {
            result: {
              value: {
                nodeName: 'INPUT',
                selector: '#my-input',
              },
            },
          };
        }
      },
    });

    // Helper to resolve node ID to object ID (mocked as returning true for simplify)
    // In the real gatherer it calls resolveNodeIdToObjectId which calls DOM.resolveNode.
    // We need to mock that or the function it calls!
    // Let's assume resolveNodeIdToObjectId works if sendCommand handles it!

    await gatherer.startInstrumentation(
      /** @type {any} */ ({driver: {defaultSession: mockSession}}));

    // Simulate issue added
    mockSession._issueHandler({
      issue: {
        code: 'GenericIssue',
        details: {
          genericIssueDetails: {
            errorType: 'FormModelContextParameterMissingTitleAndDescription',
            violatingNodeId: 123,
          },
        },
      },
    });

    const artifact = await gatherer.getArtifact(
      /** @type {any} */ ({driver: {defaultSession: mockSession}}));

    assert.equal(artifact.length, 1);
    assert.equal(artifact[0].errorType, 'FormModelContextParameterMissingTitleAndDescription');
    assert.deepEqual(artifact[0].nodeDetails, {
      nodeName: 'INPUT',
      selector: '#my-input',
    });
  });

  it('ignores unrelated issues', async () => {
    const gatherer = new WebMcpSchemaIssues();

    const mockSession = /** @type {any} */ ({
      on: (/** @type {string} */ event, /** @type {Function} */ handler) => {
        if (event === 'Audits.issueAdded') {
          mockSession._issueHandler = handler;
        }
      },
      off: () => {},
      sendCommand: async () => ({}),
    });

    await gatherer.startInstrumentation(
      /** @type {any} */ ({driver: {defaultSession: mockSession}}));

    mockSession._issueHandler({
      issue: {
        code: 'GenericIssue',
        details: {
          genericIssueDetails: {
            errorType: 'UnrelatedError',
            violatingNodeId: 123,
          },
        },
      },
    });

    const artifact = await gatherer.getArtifact(
      /** @type {any} */ ({driver: {defaultSession: mockSession}}));

    assert.equal(artifact.length, 0);
  });
});
