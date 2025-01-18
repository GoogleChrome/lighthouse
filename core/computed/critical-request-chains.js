/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lib/lantern/lantern.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRequest} from '../lib/network-request.js';
import {MainResource} from './main-resource.js';
import {PageDependencyGraph} from './page-dependency-graph.js';

class CriticalRequestChains {
  /**
   * For now, we use network priorities as a proxy for "render-blocking"/critical-ness.
   * It's imperfect, but there is not a higher-fidelity signal available yet.
   * @see https://docs.google.com/document/d/1bCDuq9H1ih9iNjgzyAL0gpwNFiEP4TZS-YLRp_RuMlc
   * @param {Lantern.Types.NetworkRequest} request
   * @param {Lantern.Types.NetworkRequest} mainResource
   * @return {boolean}
   */
  static isCritical(request, mainResource) {
    if (!mainResource) {
      throw new Error('mainResource not provided');
    }

    // The main resource is always critical.
    if (request.requestId === mainResource.requestId) return true;

    // Treat any preloaded resource as non-critical
    if (request.isLinkPreload) {
      return false;
    }

    // Whenever a request is a redirect, we don't know if it's critical until we resolve the final
    // destination. At that point we can assign all the properties (priority, resourceType) of the
    // final request back to the redirect(s) that led to it.
    // See https://github.com/GoogleChrome/lighthouse/pull/6704
    while (request.redirectDestination) {
      request = request.redirectDestination;
    }

    // Iframes are considered High Priority but they are not render blocking
    const isIframe = request.resourceType === NetworkRequest.TYPES.Document &&
      request.frameId !== mainResource.frameId;
    // XHRs are fetched at High priority, but we exclude them, as they are unlikely to be critical
    // Images are also non-critical.
    // Treat any missed images, primarily favicons, as non-critical resources
    /** @type {Array<LH.Crdp.Network.ResourceType>} */
    const nonCriticalResourceTypes = [
      NetworkRequest.TYPES.Image,
      NetworkRequest.TYPES.XHR,
      NetworkRequest.TYPES.Fetch,
      NetworkRequest.TYPES.EventSource,
    ];
    if (nonCriticalResourceTypes.includes(request.resourceType || 'Other') ||
        isIframe ||
        request.mimeType && request.mimeType.startsWith('image/')) {
      return false;
    }

    // Requests that have no initiatorRequest are typically ambiguous late-load assets.
    // Even on the off chance they were important, we don't have any parent to display for them.
    if (!request.initiatorRequest) return false;

    return ['VeryHigh', 'High', 'Medium'].includes(request.priority);
  }

  /**
   * Create a tree of critical requests.
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @return {LH.Artifacts.CriticalRequestNode}
   */
  static extractChainsFromGraph(mainResource, graph) {
    /** @type {LH.Artifacts.CriticalRequestNode} */
    const rootNode = {};

    /**
     * @param {LH.Artifacts.NetworkRequest[]} path
     */
    function addChain(path) {
      let currentNode = rootNode;

      for (const record of path) {
        if (!currentNode[record.requestId]) {
          currentNode[record.requestId] = {
            request: record,
            children: {},
          };
        }

        currentNode = currentNode[record.requestId].children;
      }
    }

    // By default `traverse` will discover nodes in BFS-order regardless of dependencies, but
    // here we need traversal in a topological sort order. We'll visit a node only when its
    // dependencies have been met.
    const seenNodes = new Set();
    /** @param {LH.Gatherer.Simulation.GraphNode} node */
    function getNextNodes(node) {
      return node.getDependents().filter(n => n.getDependencies().every(d => seenNodes.has(d)));
    }

    graph.traverse((node, traversalPath) => {
      seenNodes.add(node);
      if (node.type !== 'network') return;
      if (!CriticalRequestChains.isCritical(node.request, mainResource)) return;

      const networkPath = traversalPath
        .filter(n => n.type === 'network')
        .reverse()
        .map(node => node.rawRequest);

      // Ignore if some ancestor is not a critical request.
      if (networkPath.some(r => !CriticalRequestChains.isCritical(r, mainResource))) return;

      // Ignore non-network things (like data urls).
      if (NetworkRequest.isNonNetworkRequest(node.request)) return;

      addChain(networkPath);
    }, getNextNodes);

    return rootNode;
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog, trace: LH.Trace}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.CriticalRequestNode>}
   */
  static async compute_(data, context) {
    const mainResource = await MainResource.request(data, context);
    const graph = await PageDependencyGraph.request(data, context);

    return CriticalRequestChains.extractChainsFromGraph(mainResource, graph);
  }
}

const CriticalRequestChainsComputed =
  makeComputedArtifact(CriticalRequestChains, ['URL', 'devtoolsLog', 'trace']);
export {CriticalRequestChainsComputed as CriticalRequestChains};
