/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Capture WebMCP data
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
class WebMCP extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['navigation', 'snapshot'],
  };

  constructor() {
    super();
    /** @type {WebMCPTool[]} */
    this._tools = [];
    this._isSupported = true;
    this._onToolsAdded = this.onToolsAdded.bind(this);
    this._onToolsRemoved = this.onToolsRemoved.bind(this);
  }

  /**
   * @param {{tools: WebMCPTool[]}} event
   */
  // TODO: Handle WebMCP tools per frame.
  onToolsAdded(event) {
    // Note that as of M148, there is a bug in WebMCP CDP.
    // While WebMCP is enabled, any newly registered tool will
    // have an empty schema.
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

    try {
      await session.sendCommand('WebMCP.enable');
    } catch (err) {
      if (err.message.includes('\'WebMCP.enable\' wasn\'t found')) {
        this._isSupported = false;
        return;
      }
      throw err;
    }
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
      // Ignore errors
    }
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['WebMCP']>}
   */
  async getArtifact(context) {
    const isSupported = await context.driver.executionContext.evaluate(
      // @ts-expect-error - modelContext is not in types
      () => typeof navigator.modelContext !== 'undefined',
      {args: [], useIsolation: true}
    );
    if (!isSupported || !this._isSupported) {
      return {isSupported: false, tools: []};
    }

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
    return {
      isSupported: true,
      tools: resolvedTools,
    };
  }
}

export default WebMCP;
