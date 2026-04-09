/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit that lists registered WebMCP tools.
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that lists registered WebMCP tools. "WebMCP" stands for "Web Model Context Protocol" and should not be translated. */
  title: 'Registered WebMCP tools',
  /** Description of a Lighthouse audit that lists registered WebMCP tools. This is displayed after a user expands the section to see more. No character length limits. "WebMCP" stands for "Web Model Context Protocol", neither should be translated. */
  description: 'Checks which WebMCP tools are currently registered on the page.' +
  'The results are limited to tools registered at the time the snapshot was taken, ' +
  'and other unregistered tools may not be listed here.',
  /** Label for a column in a data table; entries will be the name of a WebMCP tool. */
  columnTool: 'Tool name',
  /** Label for a column in a data table; entries will be the description of a WebMCP tool. */
  columnDescription: 'Tool description',
  /** Label for a column in a data table; entries will be the source location where an imperative WebMCP tool was registered. */
  columnImperativeLocation: 'Imperative API Location',
  /** Label for a column in a data table; entries will be the DOM element associated with a declarative WebMCP tool. */
  columnDeclarativeElement: 'Declarative API element',
  /** Label for a column in a data table; entries will be the input schema of a WebMCP tool. */
  columnInputSchema: 'Input schema',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class WebMCPRegisteredTools extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'webmcp-registered-tools',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['WebMCPTools'],
      supportedModes: ['navigation', 'snapshot'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const tools = artifacts.WebMCPTools || [];

    const results = [];
    for (const tool of tools) {
      const isDeclarative = typeof tool.backendNodeId === 'number';

      let source;
      let element;

      if (isDeclarative && tool.nodeDetails) {
        element = Audit.makeNodeItem(tool.nodeDetails);
      } else if (isDeclarative) {
        element = `Node ID: ${tool.backendNodeId}`;
      } else if (tool.stackTrace) {
        const callFrame = tool.stackTrace.callFrames?.[0];
        if (callFrame) {
          source =
            Audit.makeSourceLocation(
              callFrame.url, callFrame.lineNumber, callFrame.columnNumber || 0
            );
        }
      }

      results.push({
        tool: tool.name,
        description: tool.description,
        source,
        element,
        inputSchema: JSON.stringify(tool.inputSchema, null, 2),
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'tool', valueType: 'text', label: str_(UIStrings.columnTool)},
      {key: 'description', valueType: 'text', label: str_(UIStrings.columnDescription)},
      {
        key: 'source',
        valueType: 'source-location',
        label: str_(UIStrings.columnImperativeLocation),
      },
      {key: 'element', valueType: 'node', label: str_(UIStrings.columnDeclarativeElement)},
      {key: 'inputSchema', valueType: 'code', label: str_(UIStrings.columnInputSchema)},
    ];

    return {
      score: 1,
      details: Audit.makeTableDetails(headings, results),
    };
  }
}

export default WebMCPRegisteredTools;
export {UIStrings};
