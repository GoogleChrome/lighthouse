/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it does have resources that are blocking first paint
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');
const BaseNode = require('../../lib/dependency-graph/base-node.js');
const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const UnusedCSS = require('../../computed/unused-css.js');
const NetworkRequest = require('../../lib/network-request.js');
const TraceOfTab = require('../../computed/trace-of-tab.js');
const LoadSimulator = require('../../computed/load-simulator.js');
const FirstContentfulPaint = require('../../computed/metrics/first-contentful-paint.js');

/** @typedef {import('../../lib/dependency-graph/simulator/simulator')} Simulator */
/** @typedef {import('../../lib/dependency-graph/base-node.js').Node} Node */
/** @typedef {import('../../lib/dependency-graph/network-node.js')} NetworkNode */

// Because of the way we detect blocking stylesheets, asynchronously loaded
// CSS with link[rel=preload] and an onload handler (see https://github.com/filamentgroup/loadCSS)
// can be falsely flagged as blocking. Therefore, ignore stylesheets that loaded fast enough
// to possibly be non-blocking (and they have minimal impact anyway).
const MINIMUM_WASTED_MS = 50;

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to reduce or remove network resources that block the initial render of the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Eliminate render-blocking resources',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce or remove network resources that block the initial render of the page. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Resources are blocking the first paint of your page. Consider ' +
    'delivering critical JS/CSS inline and deferring all non-critical ' +
    'JS/styles. [Learn more](https://web.dev/render-blocking-resources).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * Given a simulation's nodeTimings, return an object with the nodes/timing keyed by network URL
 * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
 * @return {Object<string, {node: Node, nodeTiming: LH.Gatherer.Simulation.NodeTiming}>}
 */
function getNodesAndTimingByUrl(nodeTimings) {
  /** @type {Object<string, {node: Node, nodeTiming: LH.Gatherer.Simulation.NodeTiming}>} */
  const urlMap = {};
  const nodes = Array.from(nodeTimings.keys());
  nodes.forEach(node => {
    if (node.type !== 'network') return;
    const nodeTiming = nodeTimings.get(node);
    if (!nodeTiming) return;

    urlMap[node.record.url] = {node, nodeTiming};
  });

  return urlMap;
}

class RenderBlockingResources extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'render-blocking-resources',
      title: str_(UIStrings.title),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      description: str_(UIStrings.description),
      // TODO: look into adding an `optionalArtifacts` property that captures the non-required nature
      // of CSSUsage
      requiredArtifacts: ['URL', 'TagsBlockingFirstPaint', 'traces', 'devtoolsLogs', 'CSSUsage'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{wastedMs: number, results: Array<{url: string, totalBytes: number, wastedMs: number}>}>}
   */
  static async computeResults(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const simulatorData = {devtoolsLog, settings: context.settings};
    const traceOfTab = await TraceOfTab.request(trace, context);
    const simulator = await LoadSimulator.request(simulatorData, context);
    const wastedCssBytes = await RenderBlockingResources.computeWastedCSSBytes(artifacts, context);

    const metricSettings = {throttlingMethod: 'simulate'};
    const metricComputationData = {trace, devtoolsLog, simulator, settings: metricSettings};
    // @ts-ignore - TODO(bckenny): allow optional `throttling` settings
    const fcpSimulation = await FirstContentfulPaint.request(metricComputationData, context);
    const fcpTsInMs = traceOfTab.timestamps.firstContentfulPaint / 1000;

    const nodesByUrl = getNodesAndTimingByUrl(fcpSimulation.optimisticEstimate.nodeTimings);

    const results = [];
    const deferredNodeIds = new Set();
    for (const resource of artifacts.TagsBlockingFirstPaint) {
      // Ignore any resources that finished after observed FCP (they're clearly not render-blocking)
      if (resource.endTime * 1000 > fcpTsInMs) continue;
      // TODO: beacon to Sentry, https://github.com/GoogleChrome/lighthouse/issues/7041
      if (!nodesByUrl[resource.tag.url]) continue;

      const {node, nodeTiming} = nodesByUrl[resource.tag.url];

      // Mark this node and all its dependents as deferrable
      node.traverse(node => deferredNodeIds.add(node.id));

      // "wastedMs" is the download time of the network request, responseReceived - requestSent
      const wastedMs = Math.round(nodeTiming.duration);
      if (wastedMs < MINIMUM_WASTED_MS) continue;

      results.push({
        url: resource.tag.url,
        totalBytes: resource.transferSize,
        wastedMs,
      });
    }

    if (!results.length) {
      return {results, wastedMs: 0};
    }

    const wastedMs = RenderBlockingResources.estimateSavingsWithGraphs(
      simulator,
      fcpSimulation.optimisticGraph,
      deferredNodeIds,
      wastedCssBytes
    );

    return {results, wastedMs};
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
   * @param {Simulator} simulator
   * @param {Node} fcpGraph
   * @param {Set<string>} deferredIds
   * @param {Map<string, number>} wastedCssBytesByUrl
   * @return {number}
   */
  static estimateSavingsWithGraphs(simulator, fcpGraph, deferredIds, wastedCssBytesByUrl) {
    const originalEstimate = simulator.simulate(fcpGraph).timeInMs;

    let totalChildNetworkBytes = 0;
    const minimalFCPGraph = /** @type {NetworkNode} */ (fcpGraph.cloneWithRelationships(node => {
      // If a node can be deferred, exclude it from the new FCP graph
      const canDeferRequest = deferredIds.has(node.id);
      if (node.type !== BaseNode.TYPES.NETWORK) return !canDeferRequest;

      const isStylesheet =
        node.record.resourceType === NetworkRequest.TYPES.Stylesheet;
      if (canDeferRequest && isStylesheet) {
        // We'll inline the used bytes of the stylesheet and assume the rest can be deferred
        const wastedBytes = wastedCssBytesByUrl.get(node.record.url) || 0;
        totalChildNetworkBytes += (node.record.transferSize || 0) - wastedBytes;
      }
      return !canDeferRequest;
    }));

    // Add the inlined bytes to the HTML response
    const originalTransferSize = minimalFCPGraph.record.transferSize;
    const safeTransferSize = originalTransferSize || 0;
    minimalFCPGraph.record.transferSize = safeTransferSize + totalChildNetworkBytes;
    const estimateAfterInline = simulator.simulate(minimalFCPGraph).timeInMs;
    minimalFCPGraph.record.transferSize = originalTransferSize;
    return Math.round(Math.max(originalEstimate - estimateAfterInline, 0));
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
        CSSUsage: artifacts.CSSUsage,
        URL: artifacts.URL,
        devtoolsLog: artifacts.devtoolsLogs[Audit.DEFAULT_PASS],
      }, context);
      for (const item of unusedCssItems) {
        wastedBytesByUrl.set(item.url, item.wastedBytes);
      }
    } catch (_) {}

    return wastedBytesByUrl;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {results, wastedMs} = await RenderBlockingResources.computeResults(artifacts, context);

    let displayValue = '';
    if (results.length > 0) {
      displayValue = str_(i18n.UIStrings.displayValueMsSavings, {wastedMs});
    }

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];

    const details = Audit.makeOpportunityDetails(headings, results, wastedMs);

    return {
      displayValue,
      score: ByteEfficiencyAudit.scoreForWastedMs(wastedMs),
      numericValue: wastedMs,
      numericUnit: 'millisecond',
      details,
    };
  }
}

module.exports = RenderBlockingResources;
module.exports.UIStrings = UIStrings;
