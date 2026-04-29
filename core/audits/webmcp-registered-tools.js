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
  title: 'WebMCP tools registered',
  /** Description of a Lighthouse audit that lists registered WebMCP tools. This is displayed after a user expands the section to see more. No character length limits. "WebMCP" stands for "Web Model Context Protocol", neither should be translated. */
  description: 'Lists the WebMCP tools registered at the time of analysis. ',
  /** Label for a column in a data table; entries will be the name of a WebMCP tool. */
  columnTool: 'Tool name',
  /** Label for a column in a data table; entries will be the description of a WebMCP tool. */
  columnDescription: 'Description',
  /** Label for a column in a data table; entries will be the source location where an imperative WebMCP tool was registered. */
  columnImperativeLocation: 'Source Location',
  /** Label for a column in a data table; entries will be the DOM element associated with a declarative WebMCP tool. */
  columnDeclarativeElement: 'Element',
  /** Label for a column in a data table; entries will be the input schema of a WebMCP tool. */
  columnInputSchema: 'Input schema',
  /** Title for the table listing imperative WebMCP tools. */
  titleImperativeTools: 'Imperative Tools',
  /** Title for the table listing declarative WebMCP tools. */
  titleDeclarativeTools: 'Declarative Tools',
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
      requiredArtifacts: ['WebMCP'],
      supportedModes: ['navigation', 'snapshot'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    if (!artifacts.WebMCP.isSupported) {
      return {
        notApplicable: true,
        score: 1,
      };
    }

    const tools = artifacts.WebMCP.tools || [];

    const imperativeResults = [];
    const declarativeResults = [];

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

      const item = {
        tool: tool.name,
        description: tool.description,
        inputSchema: JSON.stringify(tool.inputSchema, null, 2),
      };

      if (isDeclarative) {
        declarativeResults.push({
          ...item,
          element,
        });
      } else {
        imperativeResults.push({
          ...item,
          source,
        });
      }
    }

    const list = [];

    if (imperativeResults.length > 0) {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'tool', valueType: 'text', label: str_(UIStrings.columnTool)},
        {key: 'description', valueType: 'text', label: str_(UIStrings.columnDescription)},
        {key: 'source', valueType: 'source-location',
          label: str_(UIStrings.columnImperativeLocation)},
        {key: 'inputSchema', valueType: 'code', label: str_(UIStrings.columnInputSchema)},
      ];
      const table = Audit.makeTableDetails(headings, imperativeResults);
      list.push(Audit.makeListDetailSectionItem(table, str_(UIStrings.titleImperativeTools)));
    }

    if (declarativeResults.length > 0) {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'tool', valueType: 'text', label: str_(UIStrings.columnTool)},
        {key: 'description', valueType: 'text', label: str_(UIStrings.columnDescription)},
        {key: 'element', valueType: 'node', label: str_(UIStrings.columnDeclarativeElement)},
        {key: 'inputSchema', valueType: 'code', label: str_(UIStrings.columnInputSchema)},
      ];
      const table = Audit.makeTableDetails(headings, declarativeResults);
      list.push(Audit.makeListDetailSectionItem(table, str_(UIStrings.titleDeclarativeTools)));
    }

    if (list.length === 0) {
      return {
        score: 1,
      };
    }

    return {
      score: 1,
      details: Audit.makeListDetails(list),
    };
  }
}

export default WebMCPRegisteredTools;
export {UIStrings};
