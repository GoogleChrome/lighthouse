/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NetworkRequest} from '../lib/network-request.js';
import {MainResource} from '../computed/main-resource.js';
import {LanternLargestContentfulPaint} from '../computed/metrics/lantern-largest-contentful-paint.js';
import {LoadSimulator} from '../computed/load-simulator.js';
import {LCPImageRecord} from '../computed/lcp-image-record.js';

const UIStrings = {
  /** Title of a lighthouse audit that tells a user to preload an image in order to improve their LCP time. */
  title: 'Preload Largest Contentful Paint image',
  /** Description of a lighthouse audit that tells a user to preload an image in order to improve their LCP time.  */
  description: 'If the LCP element is dynamically added to the page, you should preload the ' +
    'image in order to improve LCP. [Learn more about preloading LCP elements](https://web.dev/articles/optimize-lcp#optimize_when_the_resource_is_discovered).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @typedef {LH.Crdp.Network.Initiator['type']|'redirect'|'fallbackToMain'} InitiatorType
 * @typedef {Array<{url: string, initiatorType: InitiatorType}>} InitiatorPath
 */

class PrioritizeLcpImage extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'prioritize-lcp-image',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      guidanceLevel: 4,
      requiredArtifacts: ['traces', 'devtoolsLogs', 'GatherContext', 'URL', 'TraceElements'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   *
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {InitiatorPath} initiatorPath
   * @return {boolean}
   */
  static shouldPreloadRequest(request, mainResource, initiatorPath) {
    // If it's already preloaded, no need to recommend it.
    if (request.isLinkPreload) return false;
    // It's not a request loaded over the network, don't recommend it.
    if (NetworkRequest.isNonNetworkRequest(request)) return false;
    // It's already discoverable from the main document (a path of [lcpRecord, mainResource]), don't recommend it.
    if (initiatorPath.length <= 2) return false;
    // Finally, return whether or not it belongs to the main frame
    return request.frameId === mainResource.frameId;
  }

  /**
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {NetworkRequest} lcpRecord
   * @return {LH.Gatherer.Simulation.GraphNetworkNode|undefined}
   */
  static findLCPNode(graph, lcpRecord) {
    for (const {node} of graph.traverseGenerator()) {
      if (node.type !== 'network') continue;
      if (node.request.requestId === lcpRecord.requestId) {
        return node;
      }
    }
  }

  /**
   * Get the initiator path starting with lcpRecord back to mainResource, inclusive.
   * Navigation redirects *to* the mainResource are not included.
   * Path returned will always be at least [lcpRecord, mainResource].
   * @param {NetworkRequest} lcpRecord
   * @param {NetworkRequest} mainResource
   * @return {InitiatorPath}
   */
  static getLcpInitiatorPath(lcpRecord, mainResource) {
    /** @type {InitiatorPath} */
    const initiatorPath = [];
    let mainResourceReached = false;
    /** @type {NetworkRequest|undefined} */
    let request = lcpRecord;

    while (request) {
      mainResourceReached ||= request.requestId === mainResource.requestId;

      /** @type {InitiatorType} */
      let initiatorType = request.initiator?.type ?? 'other';
      // Initiator type usually comes from redirect, but 'redirect' is used for more informative debugData.
      if (request.initiatorRequest && request.initiatorRequest === request.redirectSource) {
        initiatorType = 'redirect';
      }
      // Sometimes the initiator chain is broken and the best that can be done is stitch
      // back to the main resource. Note this in the initiatorType.
      if (!request.initiatorRequest && !mainResourceReached) {
        initiatorType = 'fallbackToMain';
      }

      initiatorPath.push({url: request.url, initiatorType});

      // Can't preload before the main resource, so break off initiator path there.
      if (mainResourceReached) break;

      // Continue up chain, falling back to mainResource if chain is broken.
      request = request.initiatorRequest || mainResource;
    }

    return initiatorPath;
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {NetworkRequest|undefined} lcpRecord
   * @return {{lcpNodeToPreload?: LH.Gatherer.Simulation.GraphNetworkNode, initiatorPath?: InitiatorPath}}
   */
  static getLCPNodeToPreload(mainResource, graph, lcpRecord) {
    if (!lcpRecord) return {};
    const lcpNode = PrioritizeLcpImage.findLCPNode(graph, lcpRecord);
    const initiatorPath = PrioritizeLcpImage.getLcpInitiatorPath(lcpRecord, mainResource);
    if (!lcpNode) return {initiatorPath};

    // eslint-disable-next-line max-len
    const shouldPreload = PrioritizeLcpImage.shouldPreloadRequest(lcpRecord, mainResource, initiatorPath);
    const lcpNodeToPreload = shouldPreload ? lcpNode : undefined;

    return {
      lcpNodeToPreload,
      initiatorPath,
    };
  }

  /**
   * Computes the estimated effect of preloading the LCP image.
   * @param {LH.Artifacts.TraceElement} lcpElement
   * @param {LH.Gatherer.Simulation.GraphNetworkNode|undefined} lcpNode
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @return {{wastedMs: number, results: Array<{node: LH.Audit.Details.NodeValue, url: string, wastedMs: number}>}}
   */
  static computeWasteWithGraph(lcpElement, lcpNode, graph, simulator) {
    if (!lcpNode) {
      return {
        wastedMs: 0,
        results: [],
      };
    }

    const modifiedGraph = graph.cloneWithRelationships();

    // Store the IDs of the LCP Node's dependencies for later
    /** @type {Set<string>} */
    const dependenciesIds = new Set();
    for (const node of lcpNode.getDependencies()) {
      dependenciesIds.add(node.id);
    }

    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let modifiedLCPNode = null;
    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let mainDocumentNode = null;

    for (const {node} of modifiedGraph.traverseGenerator()) {
      if (node.type !== 'network') continue;

      if (node.isMainDocument()) {
        mainDocumentNode = node;
      } else if (node.id === lcpNode.id) {
        modifiedLCPNode = node;
      }
    }

    if (!mainDocumentNode) {
      // Should always find the main document node
      throw new Error('Could not find main document node');
    }

    if (!modifiedLCPNode) {
      // Should always find the LCP node as well or else this function wouldn't have been called
      throw new Error('Could not find the LCP node');
    }

    // Preload will request the resource as soon as its discovered in the main document.
    // Reflect this change in the dependencies in our modified graph.
    modifiedLCPNode.removeAllDependencies();
    modifiedLCPNode.addDependency(mainDocumentNode);

    const simulationBeforeChanges = simulator.simulate(graph);
    const simulationAfterChanges = simulator.simulate(modifiedGraph);
    const lcpTimingsBefore = simulationBeforeChanges.nodeTimings.get(lcpNode);
    if (!lcpTimingsBefore) throw new Error('Impossible - node timings should never be undefined');
    const lcpTimingsAfter = simulationAfterChanges.nodeTimings.get(modifiedLCPNode);
    if (!lcpTimingsAfter) throw new Error('Impossible - node timings should never be undefined');
    /** @type {Map<String, LH.Gatherer.Simulation.GraphNode>} */
    const modifiedNodesById = Array.from(simulationAfterChanges.nodeTimings.keys())
      .reduce((map, node) => map.set(node.id, node), new Map());

    // Even with preload, the image can't be painted before it's even inserted into the DOM.
    // New LCP time will be the max of image download and image in DOM (endTime of its deps).
    let maxDependencyEndTime = 0;
    for (const nodeId of Array.from(dependenciesIds)) {
      const node = modifiedNodesById.get(nodeId);
      if (!node) throw new Error('Impossible - node should never be undefined');
      const timings = simulationAfterChanges.nodeTimings.get(node);
      const endTime = timings?.endTime || 0;
      maxDependencyEndTime = Math.max(maxDependencyEndTime, endTime);
    }

    const wastedMs = lcpTimingsBefore.endTime -
      Math.max(lcpTimingsAfter.endTime, maxDependencyEndTime);

    return {
      wastedMs,
      results: [{
        node: Audit.makeNodeItem(lcpElement.node),
        url: lcpNode.request.url,
        wastedMs,
      }],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const gatherContext = artifacts.GatherContext;
    const trace = artifacts.traces[PrioritizeLcpImage.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[PrioritizeLcpImage.DEFAULT_PASS];
    const URL = artifacts.URL;
    const settings = context.settings;
    const metricData = {trace, devtoolsLog, gatherContext, settings, URL};
    const lcpElement = artifacts.TraceElements
      .find(element => element.traceEventType === 'largest-contentful-paint');

    if (!lcpElement || lcpElement.type !== 'image') {
      return {score: null, notApplicable: true, metricSavings: {LCP: 0}};
    }

    const mainResource = await MainResource.request({devtoolsLog, URL}, context);
    const lanternLCP = await LanternLargestContentfulPaint.request(metricData, context);
    const simulator = await LoadSimulator.request({devtoolsLog, settings}, context);

    const lcpImageRecord = await LCPImageRecord.request({trace, devtoolsLog}, context);
    const graph = lanternLCP.pessimisticGraph;
    // Note: if moving to LCPAllFrames, mainResource would need to be the LCP frame's main resource.
    const {lcpNodeToPreload, initiatorPath} = PrioritizeLcpImage.getLCPNodeToPreload(mainResource,
        graph, lcpImageRecord);

    const {results, wastedMs} =
      PrioritizeLcpImage.computeWasteWithGraph(lcpElement, lcpNodeToPreload, graph, simulator);

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];
    const details = Audit.makeOpportunityDetails(headings, results,
      {overallSavingsMs: wastedMs, sortedBy: ['wastedMs']});

    // If LCP element was an image and had valid network records (regardless of
    // if it should be preloaded), it will be found first in the `initiatorPath`.
    // Otherwise path and length will be undefined.
    if (initiatorPath) {
      details.debugData = {
        type: 'debugdata',
        initiatorPath,
        pathLength: initiatorPath.length,
      };
    }

    return {
      score: results.length ? 0 : 1,
      numericValue: wastedMs,
      numericUnit: 'millisecond',
      displayValue: wastedMs ? str_(i18n.UIStrings.displayValueMsSavings, {wastedMs}) : '',
      details,
      metricSavings: {LCP: wastedMs},
    };
  }
}

export default PrioritizeLcpImage;
export {UIStrings};
