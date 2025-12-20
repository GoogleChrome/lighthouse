/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../lib/url-shim.js');
const Audit = require('./audit.js');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit.js');
const CriticalRequestChains = require('../computed/critical-request-chains.js');
const i18n = require('../lib/i18n/i18n.js');
const MainResource = require('../computed/main-resource.js');
const PageDependencyGraph = require('../computed/page-dependency-graph.js');
const LoadSimulator = require('../computed/load-simulator.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to use <link rel=preload> to initiate important network requests earlier during page load. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Preload key requests',
  /** Description of a Lighthouse audit that tells the user *why* they should preload important network requests. The associated network requests are started halfway through pageload (or later) but should be started at the beginning. This is displayed after a user expands the section to see more. No character length limits. '<link rel=preload>' is the html code the user would include in their page and shouldn't be translated. 'Learn More' becomes link text to additional documentation. */
  description: 'Consider using `<link rel=preload>` to prioritize fetching resources that are ' +
    'currently requested later in page load. [Learn more](https://web.dev/uses-rel-preload).',
  /**
   * @description A warning message that is shown when the user tried to follow the advice of the audit, but it's not working as expected. Forgetting to set the `crossorigin` HTML attribute, or setting it to an incorrect value, on the link is a common mistake when adding preload links.
   * @example {https://example.com} preloadURL
   * */
  crossoriginWarning: 'A preload <link> was found for "{preloadURL}" but was not used ' +
    'by the browser. Check that you are using the `crossorigin` attribute properly.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const THRESHOLD_IN_MS = 100;

class UsesRelPreloadAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-rel-preload',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs', 'traces', 'URL'],
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
    };
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @return {Set<string>}
   */
  static getURLsToPreload(mainResource, graph) {
    /** @type {Set<string>} */
    const urls = new Set();

    graph.traverse((node, traversalPath) => {
      if (node.type !== 'network') return;
      // Don't include the node itself or any CPU nodes in the initiatorPath
      const path = traversalPath.slice(1).filter(initiator => initiator.type === 'network');
      if (!UsesRelPreloadAudit.shouldPreloadRequest(node.record, mainResource, path)) return;
      urls.add(node.record.url);
    });

    return urls;
  }

  /**
   * Finds which URLs were attempted to be preloaded, but failed to be reused and were requested again.
   *
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @return {Set<string>}
   */
  static getURLsFailedToPreload(graph) {
    /** @type {Array<LH.Artifacts.NetworkRequest>} */
    const requests = [];
    graph.traverse(node => node.type === 'network' && requests.push(node.record));

    const preloadRequests = requests.filter(req => req.isLinkPreload);
    const preloadURLsByFrame = new Map();
    for (const request of preloadRequests) {
      const preloadURLs = preloadURLsByFrame.get(request.frameId) || new Set();
      preloadURLs.add(request.url);
      preloadURLsByFrame.set(request.frameId, preloadURLs);
    }

    // A failed preload attempt will manifest as a URL that was requested twice within the same frame.
    // Once with `isLinkPreload` AND again without `isLinkPreload`.
    const duplicateRequestsAfterPreload = requests.filter(request => {
      const preloadURLsForFrame = preloadURLsByFrame.get(request.frameId);
      if (!preloadURLsForFrame) return false;
      if (!preloadURLsForFrame.has(request.url)) return false;
      return !request.isLinkPreload;
    });
    return new Set(duplicateRequestsAfterPreload.map(req => req.url));
  }

  /**
   * We want to preload all first party critical requests at depth 2.
   * Third party requests can be tricky to know the URL ahead of time.
   * Critical requests at depth 1 would already be identified by the browser for preloading.
   * Critical requests deeper than depth 2 are more likely to be a case-by-case basis such that it
   * would be a little risky to recommend blindly.
   *
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {Array<LH.Gatherer.Simulation.GraphNode>} initiatorPath
   * @return {boolean}
   */
  static shouldPreloadRequest(request, mainResource, initiatorPath) {
    const mainResourceDepth = mainResource.redirects ? mainResource.redirects.length : 0;

    // If it's already preloaded, no need to recommend it.
    if (request.isLinkPreload) return false;
    // It's not critical, don't recommend it.
    if (!CriticalRequestChains.isCritical(request, mainResource)) return false;
    // It's not a request loaded over the network, don't recommend it.
    if (URL.NON_NETWORK_PROTOCOLS.includes(request.protocol)) return false;
    // It's not at the right depth, don't recommend it.
    if (initiatorPath.length !== mainResourceDepth + 2) return false;
    // It's not a request for the main frame, it wouldn't get reused even if you did preload it.
    if (request.frameId !== mainResource.frameId) return false;
    // We survived everything else, just check that it's a first party request.
    return URL.rootDomainsMatch(request.url, mainResource.url);
  }

  /**
   * Computes the estimated effect of preloading all the resources.
   * @param {Set<string>} urls The array of byte savings results per resource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @return {{wastedMs: number, results: Array<{url: string, wastedMs: number}>}}
   */
  static computeWasteWithGraph(urls, graph, simulator) {
    if (!urls.size) {
      return {wastedMs: 0, results: []};
    }

    // Preload changes the ordering of requests, simulate the original graph with flexible ordering
    // to have a reasonable baseline for comparison.
    const simulationBeforeChanges = simulator.simulate(graph, {flexibleOrdering: true});
    const modifiedGraph = graph.cloneWithRelationships();

    /** @type {Array<LH.Gatherer.Simulation.GraphNetworkNode>} */
    const nodesToPreload = [];
    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let mainDocumentNode = null;
    modifiedGraph.traverse(node => {
      if (node.type !== 'network') return;

      const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
      if (node.isMainDocument()) {
        mainDocumentNode = networkNode;
      } else if (networkNode.record && urls.has(networkNode.record.url)) {
        nodesToPreload.push(networkNode);
      }
    });

    if (!mainDocumentNode) {
      // Should always find the main document node
      throw new Error('Could not find main document node');
    }

    // Preload has the effect of moving the resource's only dependency to the main HTML document
    // Remove all dependencies of the nodes
    for (const node of nodesToPreload) {
      node.removeAllDependencies();
      node.addDependency(mainDocumentNode);
    }

    // Once we've modified the dependencies, simulate the new graph with flexible ordering.
    const simulationAfterChanges = simulator.simulate(modifiedGraph, {flexibleOrdering: true});
    const originalNodesByRecord = Array.from(simulationBeforeChanges.nodeTimings.keys())
        // @ts-ignore we don't care if all nodes without a record collect on `undefined`
        .reduce((map, node) => map.set(node.record, node), new Map());

    const results = [];
    for (const node of nodesToPreload) {
      const originalNode = originalNodesByRecord.get(node.record);
      const timingAfter = simulationAfterChanges.nodeTimings.get(node);
      const timingBefore = simulationBeforeChanges.nodeTimings.get(originalNode);
      if (!timingBefore || !timingAfter) throw new Error('Missing preload node');

      const wastedMs = Math.round(timingBefore.endTime - timingAfter.endTime);
      if (wastedMs < THRESHOLD_IN_MS) continue;
      results.push({url: node.record.url, wastedMs});
    }

    if (!results.length) {
      return {wastedMs: 0, results};
    }

    return {
      // Preload won't necessarily impact the deepest chain/overall time
      // We'll use the maximum endTime improvement for now
      wastedMs: Math.max(...results.map(item => item.wastedMs)),
      results,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[UsesRelPreloadAudit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[UsesRelPreloadAudit.DEFAULT_PASS];
    const URL = artifacts.URL;
    const simulatorOptions = {trace, devtoolsLog, settings: context.settings};

    const [mainResource, graph, simulator] = await Promise.all([
      MainResource.request({devtoolsLog, URL}, context),
      PageDependencyGraph.request({trace, devtoolsLog}, context),
      LoadSimulator.request(simulatorOptions, context),
    ]);

    const urls = UsesRelPreloadAudit.getURLsToPreload(mainResource, graph);
    const {results, wastedMs} = UsesRelPreloadAudit.computeWasteWithGraph(urls, graph, simulator);
    // sort results by wastedTime DESC
    results.sort((a, b) => b.wastedMs - a.wastedMs);

    /** @type {Array<string>|undefined} */
    let warnings;
    const failedURLs = UsesRelPreloadAudit.getURLsFailedToPreload(graph);
    if (failedURLs.size) {
      warnings = Array.from(failedURLs)
        .map(preloadURL => str_(UIStrings.crossoriginWarning, {preloadURL}));
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];
    const details = Audit.makeOpportunityDetails(headings, results, wastedMs);

    return {
      score: UnusedBytes.scoreForWastedMs(wastedMs),
      numericValue: wastedMs,
      numericUnit: 'millisecond',
      displayValue: wastedMs ?
        str_(i18n.UIStrings.displayValueMsSavings, {wastedMs}) :
        '',
      extendedInfo: {
        value: results,
      },
      details,
      warnings,
    };
  }
}

module.exports = UsesRelPreloadAudit;
module.exports.UIStrings = UIStrings;
