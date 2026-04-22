/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Capture WebMCP CDP events
 */

import BaseGatherer from '../base-gatherer.js';
import {resolveNodeIdToObjectId} from '../driver/dom.js';
import {pageFunctions} from '../../lib/page-functions.js';
import {ExecutionContext} from '../driver/execution-context.js';

/**
 * @typedef {Object} WebMCPTool
 * @property {string} name
 * @property {string} description
 * @property {Record<string, any>} inputSchema
 * @property {string} frameId
 * @property {number} [backendNodeId]
 * @property {any} [stackTrace]
 * @property {LH.Artifacts.NodeDetails} [nodeDetails]
 */
class WebMCPTools extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['navigation', 'snapshot'],
  };

  constructor() {
    super();
    /** @type {WebMCPTool[]} */
    this._tools = [];
    this._onToolsAdded = this.onToolsAdded.bind(this);
    this._onToolsRemoved = this.onToolsRemoved.bind(this);
  }

  /**
   * @param {{tools: WebMCPTool[]}} event
   */
  // TODO: Handle WebMCP tools per frame.
  onToolsAdded(event) {
    // Note there is a bug right now in WebMCP.enable CDP where on newly registered tools
    // while WebMCP is enabled, the schema is empty. We will have to address that
    // eventually.
    if (event.tools) {
      this._tools.push(...event.tools);
    }
  }

  /**
   * @param {{tools: WebMCPTool[]}} event
   */
  onToolsRemoved(event) {
    if (event.tools) {
      const removedNames = new Set(event.tools.map(t => t.name));
      this._tools = this._tools.filter(t => !removedNames.has(t.name));
    }
  }

  /**
   * @param {LH.Gatherer.Context} passContext
   */
  async startInstrumentation(passContext) {
    const session = passContext.driver.defaultSession;

    // @ts-expect-error - WebMCP domain might not be in types yet.
    session.on('WebMCP.toolsAdded', this._onToolsAdded);
    // @ts-expect-error
    session.on('WebMCP.toolsRemoved', this._onToolsRemoved);

    await session.sendCommand('WebMCP.enable');
  }

  /**
   * @param {LH.Gatherer.Context} passContext
   */
  async stopInstrumentation(passContext) {
    const session = passContext.driver.defaultSession;
    // @ts-expect-error
    session.off('WebMCP.toolsAdded', this._onToolsAdded);
    // @ts-expect-error
    session.off('WebMCP.toolsRemoved', this._onToolsRemoved);
    try {
      await session.sendCommand('WebMCP.disable');
    } catch (err) {
      // WebMCP.disable might not be implemented or fail, ignore it.
    }
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<WebMCPTool[]>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;

    // Remove duplicates based on name, keeping the latest occurrence.
    const toolMap = new Map();
    for (const tool of this._tools) {
      toolMap.set(tool.name, tool);
    }

    const resolvedTools = [];
    for (const tool of toolMap.values()) {
      if (tool.backendNodeId) {
        try {
          const objectId = await resolveNodeIdToObjectId(session, tool.backendNodeId);
          if (objectId) {
            const deps = ExecutionContext.serializeDeps([
              pageFunctions.getNodeDetails,
            ]);
            const response = await session.sendCommand('Runtime.callFunctionOn', {
              objectId,
              functionDeclaration: `function () {
                ${deps}
                return getNodeDetails(this);
              }`,
              returnByValue: true,
              awaitPromise: true,
            });
            if (response && response.result && response.result.value) {
              tool.nodeDetails = response.result.value;
            }
          }
        } catch (err) {
          // Ignore error
        }
      }
      resolvedTools.push(tool);
    }

    return resolvedTools;
  }
}

export default WebMCPTools;
