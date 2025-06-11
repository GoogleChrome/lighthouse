/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * Creates nodes for treemap app.
 * Example output: treemap/app/debug.json
 */

/**
 * @typedef {Omit<LH.Treemap.Node, 'name'|'children'>} SourceData
 */

import {Audit} from './audit.js';
import {JSBundles} from '../computed/js-bundles.js';
import {NetworkRecords} from '../computed/network-records.js';
import {UnusedJavascriptSummary} from '../computed/unused-javascript-summary.js';
import {ModuleDuplication} from '../computed/module-duplication.js';
import {getRequestForScript, isInline} from '../lib/script-helpers.js';

class ScriptTreemapDataAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'script-treemap-data',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Script Treemap Data',
      description: 'Used for treemap app',
      requiredArtifacts:
        ['Trace', 'DevtoolsLog', 'SourceMaps', 'Scripts', 'JsUsage', 'URL', 'SourceMaps'],
    };
  }

  /**
   * Returns a tree data structure where leaf nodes are sources (ie. real files from source tree)
   * from a source map, and non-leaf nodes are directories. Leaf nodes have data
   * for bytes, coverage, etc., when available, and non-leaf nodes have the
   * same data as the sum of all descendant leaf nodes.
   * @param {string} src
   * @param {string} sourceRoot
   * @param {Record<string, SourceData>} sourcesData
   * @return {LH.Treemap.Node}
   */
  static makeScriptNode(src, sourceRoot, sourcesData) {
    /**
     * @param {string} name
     * @return {LH.Treemap.Node}
     */
    function newNode(name) {
      return {
        name,
        resourceBytes: 0,
        encodedBytes: undefined,
      };
    }

    const sourceRootNode = newNode(sourceRoot);

    /**
     * Given a slash-delimited path, traverse the Node structure and increment
     * the data provided for each node in the chain. Creates nodes as needed.
     * Ex: path/to/file.js will find or create "path" on `node`, increment the data fields,
     *     and continue with "to", and so on.
     * @param {string} source
     * @param {SourceData} data
     */
    function addAllNodesInSourcePath(source, data) {
      let node = sourceRootNode;

      // Apply the data to the sourceRootNode.
      sourceRootNode.resourceBytes += data.resourceBytes;
      if (data.unusedBytes) {
        sourceRootNode.unusedBytes = (sourceRootNode.unusedBytes || 0) + data.unusedBytes;
      }

      // Strip off the shared root.
      const sourcePathSegments = source.replace(sourceRoot, '').split(/\/+/);
      sourcePathSegments.forEach((sourcePathSegment, i) => {
        if (sourcePathSegment.length === 0) return;

        const isLeaf = i === sourcePathSegments.length - 1;

        let child = node.children && node.children.find(child => child.name === sourcePathSegment);
        if (!child) {
          child = newNode(sourcePathSegment);
          node.children = node.children || [];
          node.children.push(child);
        }
        node = child;

        // Now that we've found or created the next node in the path, apply the data.
        node.resourceBytes += data.resourceBytes;
        if (data.unusedBytes) node.unusedBytes = (node.unusedBytes || 0) + data.unusedBytes;

        // Only leaf nodes might have duplication data.
        if (isLeaf && data.duplicatedNormalizedModuleName !== undefined) {
          node.duplicatedNormalizedModuleName = data.duplicatedNormalizedModuleName;
        }
      });
    }

    // For every source file, apply the data to all components
    // of the source path, creating nodes as necessary.
    for (const [source, data] of Object.entries(sourcesData)) {
      addAllNodesInSourcePath(source, data);
    }

    /**
     * Collapse nodes that have only one child.
     * @param {LH.Treemap.Node} node
     */
    function collapseAll(node) {
      while (node.children && node.children.length === 1) {
        const child = node.children[0];
        node.name += '/' + child.name;
        if (child.duplicatedNormalizedModuleName) {
          node.duplicatedNormalizedModuleName = child.duplicatedNormalizedModuleName;
        }
        node.children = child.children;
      }

      if (node.children) {
        for (const child of node.children) {
          collapseAll(child);
        }
      }
    }
    collapseAll(sourceRootNode);

    // If sourceRootNode.name is falsy (no defined sourceRoot + no collapsed common prefix),
    // collapse the sourceRootNode children into the scriptNode.
    // Otherwise, we add another node.
    if (!sourceRootNode.name) {
      return {
        ...sourceRootNode,
        name: src,
        children: sourceRootNode.children,
      };
    }

    // Script node should be just the script src.
    const scriptNode = {...sourceRootNode};
    scriptNode.name = src;
    scriptNode.children = [sourceRootNode];
    return scriptNode;
  }

  /**
   * Returns nodes where the first level of nodes are URLs.
   * Every external script has a node.
   * All inline scripts are combined into a single node.
   * If a script has a source map, that node will be created by makeScriptNode.
   *
   * Example return result:
     - index.html (inline scripts)
     - main.js
     - - webpack://
     - - - react.js
     - - - app.js
     - i-have-no-map.js
   *
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Treemap.Node[]>}
   */
  static async makeNodes(artifacts, context) {
    const devtoolsLog = artifacts.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    /** @type {LH.Treemap.Node[]} */
    const nodes = [];
    /** @type {Map<string, LH.Treemap.Node>} */
    const htmlNodesByFrameId = new Map();
    const bundles = await JSBundles.request(artifacts, context);
    const duplicationByPath = await ModuleDuplication.request(artifacts, context);

    for (const script of artifacts.Scripts) {
      if (script.scriptLanguage !== 'JavaScript') continue;

      const name = script.url;
      const bundle = bundles.find(bundle => script.scriptId === bundle.script.scriptId) ?? null;
      const scriptCoverage = /** @type {LH.Artifacts['JsUsage'][string] | undefined} */
        (artifacts.JsUsage[script.scriptId]);
      const unusedJavascriptSummary = scriptCoverage ?
        await UnusedJavascriptSummary.request(
          {scriptId: script.scriptId, scriptCoverage, bundle}, context) :
        undefined;

      /** @type {LH.Treemap.Node} */
      let node;
      if (bundle && !('errorMessage' in bundle.sizes)) {
        // Create nodes for each module in a bundle.

        /** @type {Record<string, SourceData>} */
        const sourcesData = {};
        for (const source of Object.keys(bundle.sizes.files)) {
          /** @type {SourceData} */
          const sourceData = {
            resourceBytes: bundle.sizes.files[source],
          };

          if (unusedJavascriptSummary?.sourcesWastedBytes) {
            sourceData.unusedBytes = unusedJavascriptSummary.sourcesWastedBytes[source];
          }

          // ModuleDuplication uses keys without the source root prepended, but
          // bundle.sizes uses keys with it prepended, so we remove the source root before
          // using it with duplicationByPath.
          let sourceWithoutSourceRoot = source;
          if (bundle.rawMap.sourceRoot && source.startsWith(bundle.rawMap.sourceRoot)) {
            sourceWithoutSourceRoot = source.replace(bundle.rawMap.sourceRoot, '');
          }

          const key = ModuleDuplication.normalizeSource(sourceWithoutSourceRoot);
          if (duplicationByPath.has(key)) sourceData.duplicatedNormalizedModuleName = key;

          sourcesData[source] = sourceData;
        }

        if (bundle.sizes.unmappedBytes) {
          /** @type {SourceData} */
          const sourceData = {
            resourceBytes: bundle.sizes.unmappedBytes,
          };
          if (unusedJavascriptSummary?.sourcesWastedBytes) {
            sourceData.unusedBytes = unusedJavascriptSummary.sourcesWastedBytes['(unmapped)'];
          }
          sourcesData['(unmapped)'] = sourceData;
        }

        node = this.makeScriptNode(script.url, bundle.rawMap.sourceRoot || '', sourcesData);
      } else {
        // No valid source map for this script, so we can only produce a single node.
        node = {
          name,
          resourceBytes: unusedJavascriptSummary?.totalBytes ?? script.length ?? 0,
          encodedBytes: undefined,
          unusedBytes: unusedJavascriptSummary?.wastedBytes,
        };
      }

      // If this is an inline script, place the node inside a top-level (aka depth-one) node.
      // Also separate each iframe / the main page's inline scripts into their own top-level nodes.
      if (isInline(script)) {
        let htmlNode = htmlNodesByFrameId.get(script.executionContextAuxData.frameId);
        if (!htmlNode) {
          htmlNode = {
            name,
            resourceBytes: 0,
            encodedBytes: undefined,
            unusedBytes: undefined,
            children: [],
          };
          htmlNodesByFrameId.set(script.executionContextAuxData.frameId, htmlNode);
          nodes.push(htmlNode);
        }
        htmlNode.resourceBytes += node.resourceBytes;
        if (node.unusedBytes) htmlNode.unusedBytes = (htmlNode.unusedBytes || 0) + node.unusedBytes;
        node.name = script.content ?
          '(inline) ' + script.content.trimStart().substring(0, 15) + '…' :
          '(inline)';
        htmlNode.children?.push(node);
      } else {
        // Non-inline scripts each have their own top-level node.
        nodes.push(node);

        const networkRecord = getRequestForScript(networkRecords, script);
        if (networkRecord) {
          const bodyTransferSize =
            networkRecord.transferSize - networkRecord.responseHeadersTransferSize;
          node.encodedBytes = bodyTransferSize;
        } else {
          node.encodedBytes = node.resourceBytes;
        }
      }
    }

    // For the HTML nodes, set encodedBytes to be the size of all the inline
    // scripts multiplied by the average compression ratio of the HTML document.
    for (const [frameId, node] of htmlNodesByFrameId) {
      const record =
        networkRecords.find(r => r.resourceType === 'Document' && r.frameId === frameId);
      if (record) {
        const inlineScriptsPct = node.resourceBytes / record.resourceSize;
        const bodyTransferSize = record.transferSize - record.responseHeadersTransferSize;
        node.encodedBytes = Math.floor(bodyTransferSize * inlineScriptsPct);
      } else {
        node.encodedBytes = node.resourceBytes;
      }
    }

    return nodes;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const nodes = await ScriptTreemapDataAudit.makeNodes(artifacts, context);

    /** @type {LH.Audit.Details.TreemapData} */
    const details = {
      type: 'treemap-data',
      nodes,
    };

    return {
      score: 1,
      details,
    };
  }
}

export default ScriptTreemapDataAudit;
