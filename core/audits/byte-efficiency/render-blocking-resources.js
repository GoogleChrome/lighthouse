/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit a page to see if it does have resources that are blocking first paint
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import * as Lantern from '../../lib/lantern/lantern.js';
import {UnusedCSS} from '../../computed/unused-css.js';
import {NetworkRequest} from '../../lib/network-request.js';
import {LoadSimulator} from '../../computed/load-simulator.js';
import {FirstContentfulPaint} from '../../computed/metrics/first-contentful-paint.js';
import {LCPImageRecord} from '../../computed/lcp-image-record.js';
import {NavigationInsights} from '../../computed/navigation-insights.js';

// Because of the way we detect blocking stylesheets, asynchronously loaded
// CSS with link[rel=preload] and an onload handler (see https://github.com/filamentgroup/loadCSS)
// can be falsely flagged as blocking. Therefore, ignore stylesheets that loaded fast enough
// to possibly be non-blocking (and they have minimal impact anyway).
const MINIMUM_WASTED_MS = 50;

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to reduce or remove network resources that block the initial render of the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Eliminate render-blocking resources',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce or remove network resources that block the initial render of the page. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Resources are blocking the first paint of your page. Consider ' +
    'delivering critical JS/CSS inline and deferring all non-critical ' +
    'JS/styles. [Learn how to eliminate render-blocking resources](https://developer.chrome.com/docs/lighthouse/performance/render-blocking-resources/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * Given a simulation's nodeTimings, return an object with the nodes/timing keyed by network URL
 * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
 * @return {Map<string, {node: LH.Gatherer.Simulation.GraphNetworkNode, nodeTiming: LH.Gatherer.Simulation.NodeTiming}>}
 */
function getNodesAndTimingByRequestId(nodeTimings) {
  /** @type {Map<string, {node: LH.Gatherer.Simulation.GraphNetworkNode, nodeTiming: LH.Gatherer.Simulation.NodeTiming}>} */
  const requestIdToNode = new Map();

  for (const [node, nodeTiming] of nodeTimings) {
    if (node.type !== 'network') continue;

    requestIdToNode.set(node.request.requestId, {node, nodeTiming});
  }

  return requestIdToNode;
}

/**
 * Adjust the timing of a node and its dependencies to account for stack specific overrides.
 * @param {Map<LH.Gatherer.Simulation.GraphNode, LH.Gatherer.Simulation.NodeTiming>} adjustedNodeTimings
 * @param {LH.Gatherer.Simulation.GraphNode} node
 * @param {LH.Artifacts.DetectedStack[]} Stacks
 */
function adjustNodeTimings(adjustedNodeTimings, node, Stacks) {
  const nodeTiming = adjustedNodeTimings.get(node);
  if (!nodeTiming) return;
  const stackSpecificTiming = computeStackSpecificTiming(node, nodeTiming, Stacks);
  const difference = nodeTiming.duration - stackSpecificTiming.duration;
  if (!difference) return;

  // AMP's method of removal of stylesheets effectively removes all dependent nodes from the FCP graph
  node.traverse(childNode => {
    adjustedNodeTimings.delete(childNode);
  });
  adjustedNodeTimings.set(node, stackSpecificTiming);
}

/**
 * Any stack specific timing overrides should go in this function.
 * @see https://github.com/GoogleChrome/lighthouse/issues/2832#issuecomment-591066081
 *
 * @param {LH.Gatherer.Simulation.GraphNode} node
 * @param {LH.Gatherer.Simulation.NodeTiming} nodeTiming
 * @param {LH.Artifacts.DetectedStack[]} Stacks
 */
function computeStackSpecificTiming(node, nodeTiming, Stacks) {
  const stackSpecificTiming = {...nodeTiming};
  if (Stacks.some(stack => stack.id === 'amp')) {
    // AMP will load a linked stylesheet asynchronously if it has not been loaded after 2.1 seconds:
    // https://github.com/ampproject/amphtml/blob/8e03ac2f315774070651584a7e046ff24212c9b1/src/font-stylesheet-timeout.js#L54-L59
    // Any potential savings must only include time spent on AMP stylesheet nodes before 2.1 seconds.
    if (node.type === Lantern.Graph.BaseNode.types.NETWORK &&
        node.request.resourceType === NetworkRequest.TYPES.Stylesheet &&
        nodeTiming.endTime > 2100) {
      stackSpecificTiming.endTime = Math.max(nodeTiming.startTime, 2100);
      stackSpecificTiming.duration = stackSpecificTiming.endTime - stackSpecificTiming.startTime;
    }
  }
  return stackSpecificTiming;
}

class RenderBlockingResources extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'render-blocking-resources',
      title: str_(UIStrings.title),
      supportedModes: ['navigation'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      description: str_(UIStrings.description),
      guidanceLevel: 2,
      // TODO: look into adding an `optionalArtifacts` property that captures the non-required nature
      // of CSSUsage
      requiredArtifacts:
        ['URL', 'traces', 'devtoolsLogs', 'Stylesheets', 'CSSUsage', 'GatherContext', 'Stacks'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{fcpWastedMs: number, lcpWastedMs: number, results: Array<{url: string, totalBytes: number, wastedMs: number}>}>}
   */
  static async computeResults(artifacts, context) {
    const gatherContext = artifacts.GatherContext;
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const simulatorData = {devtoolsLog, settings: context.settings};
    const simulator = await LoadSimulator.request(simulatorData, context);
    const wastedCssBytes = await RenderBlockingResources.computeWastedCSSBytes(artifacts, context);
    const navInsights = await NavigationInsights.request(trace, context);

    const renderBlocking = navInsights.model.RenderBlocking;
    if (renderBlocking instanceof Error) throw renderBlocking;

    /** @type {LH.Audit.Context['settings']} */
    const metricSettings = {
      ...context.settings,
      throttlingMethod: 'simulate',
    };

    const metricComputationData = {trace, devtoolsLog, gatherContext, simulator,
      settings: metricSettings, URL: artifacts.URL};

    // Cast to just `LanternMetric` since we explicitly set `throttlingMethod: 'simulate'`.
    const fcpSimulation = /** @type {LH.Artifacts.LanternMetric} */
      (await FirstContentfulPaint.request(metricComputationData, context));

    const nodesAndTimingsByRequestId =
      getNodesAndTimingByRequestId(fcpSimulation.optimisticEstimate.nodeTimings);

    const results = [];
    const deferredNodeIds = new Set();
    for (const resource of renderBlocking.renderBlockingRequests) {
      const nodeAndTiming = nodesAndTimingsByRequestId.get(resource.args.data.requestId);
      // TODO: beacon to Sentry, https://github.com/GoogleChrome/lighthouse/issues/7041
      if (!nodeAndTiming) continue;

      const {node, nodeTiming} = nodeAndTiming;

      const stackSpecificTiming = computeStackSpecificTiming(node, nodeTiming, artifacts.Stacks);

      // Mark this node and all its dependents as deferrable
      node.traverse(node => deferredNodeIds.add(node.id));

      // "wastedMs" is the download time of the network request, responseReceived - requestSent
      const wastedMs = Math.round(stackSpecificTiming.duration);
      if (wastedMs < MINIMUM_WASTED_MS) continue;

      results.push({
        url: resource.args.data.url,
        totalBytes: node.request.transferSize,
        wastedMs,
      });
    }

    if (!results.length) {
      return {results, fcpWastedMs: 0, lcpWastedMs: 0};
    }

    const fcpWastedMs = RenderBlockingResources.estimateSavingsWithGraphs(
      simulator,
      fcpSimulation.optimisticGraph,
      deferredNodeIds,
      wastedCssBytes,
      artifacts.Stacks
    );

    const lcpRecord = await LCPImageRecord.request(metricComputationData, context);

    // In most cases if the LCP is an image, render blocking resources don't affect LCP. For these cases we should reduce its impact.
    return {results, fcpWastedMs, lcpWastedMs: lcpRecord ? 0 : fcpWastedMs};
  }

  /**
   * Estimates how much faster this page would reach FCP if we inlined all the used CSS from the
   * render blocking stylesheets and deferred all the scripts. This is more conservative than
   * removing all the assets and more aggressive than inlining everything.
   *
   * *Most* of the time, scripts in the head are there accidentally/due to lack of awareness
   * rather than necessity, so we're comfortable with this balance. In the worst case, we're telling
   * devs that they should be able to get to a reasonable first paint without JS, which is not a bad
   * thing.
   *
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @param {LH.Gatherer.Simulation.GraphNode} fcpGraph
   * @param {Set<string>} deferredIds
   * @param {Map<string, number>} wastedCssBytesByUrl
   * @param {LH.Artifacts.DetectedStack[]} Stacks
   * @return {number}
   */
  static estimateSavingsWithGraphs(simulator, fcpGraph, deferredIds, wastedCssBytesByUrl, Stacks) {
    const {nodeTimings} = simulator.simulate(fcpGraph);
    const adjustedNodeTimings = new Map(nodeTimings);

    let totalChildNetworkBytes = 0;
    const minimalFCPGraph = fcpGraph.cloneWithRelationships(node => {
      adjustNodeTimings(adjustedNodeTimings, node, Stacks);

      // If a node can be deferred, exclude it from the new FCP graph
      const canDeferRequest = deferredIds.has(node.id);
      if (node.type !== Lantern.Graph.BaseNode.types.NETWORK) return !canDeferRequest;

      const isStylesheet =
        node.request.resourceType === NetworkRequest.TYPES.Stylesheet;
      if (canDeferRequest && isStylesheet) {
        // We'll inline the used bytes of the stylesheet and assume the rest can be deferred
        const wastedBytes = wastedCssBytesByUrl.get(node.request.url) || 0;
        totalChildNetworkBytes += (node.request.transferSize || 0) - wastedBytes;
      }
      return !canDeferRequest;
    });

    if (minimalFCPGraph.type !== 'network') {
      throw new Error('minimalFCPGraph not a NetworkNode');
    }

    // Recalculate the "before" time based on our adjusted node timings.
    const estimateBeforeInline = Math.max(...Array.from(
      Array.from(adjustedNodeTimings).map(timing => timing[1].endTime)
    ));

    // Add the inlined bytes to the HTML response
    const originalTransferSize = minimalFCPGraph.request.transferSize;
    const safeTransferSize = originalTransferSize || 0;
    minimalFCPGraph.request.transferSize = safeTransferSize + totalChildNetworkBytes;
    const estimateAfterInline = simulator.simulate(minimalFCPGraph).timeInMs;
    minimalFCPGraph.request.transferSize = originalTransferSize;
    return Math.round(Math.max(estimateBeforeInline - estimateAfterInline, 0));
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<Map<string, number>>}
   */
  static async computeWastedCSSBytes(artifacts, context) {
    const wastedBytesByUrl = new Map();
    try {
      const unusedCssItems = await UnusedCSS.request({
        Stylesheets: artifacts.Stylesheets,
        CSSUsage: artifacts.CSSUsage,
        devtoolsLog: artifacts.devtoolsLogs[Audit.DEFAULT_PASS],
      }, context);
      for (const item of unusedCssItems) {
        wastedBytesByUrl.set(item.url, item.wastedBytes);
      }
    } catch {}

    return wastedBytesByUrl;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {results, fcpWastedMs, lcpWastedMs} =
      await RenderBlockingResources.computeResults(artifacts, context);

    let displayValue;
    if (results.length > 0) {
      displayValue = str_(i18n.UIStrings.displayValueMsSavings, {wastedMs: fcpWastedMs});
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];

    const details = Audit.makeOpportunityDetails(headings, results,
      {overallSavingsMs: fcpWastedMs});

    return {
      displayValue,
      score: results.length ? 0 : 1,
      numericValue: fcpWastedMs,
      numericUnit: 'millisecond',
      details,
      metricSavings: {FCP: fcpWastedMs, LCP: lcpWastedMs},
    };
  }
}

export default RenderBlockingResources;
export {UIStrings};
