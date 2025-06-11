/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {NetworkRecords} from '../../computed/network-records.js';
import {LoadSimulator} from '../../computed/load-simulator.js';
import {LanternLargestContentfulPaint as LanternLCP} from '../../computed/metrics/lantern-largest-contentful-paint.js';
import {LanternFirstContentfulPaint as LanternFCP} from '../../computed/metrics/lantern-first-contentful-paint.js';
import {LCPImageRecord} from '../../computed/lcp-image-record.js';

const str_ = i18n.createIcuMessageFn(import.meta.url, {});

// Parameters for log-normal distribution scoring. These values were determined by fitting the
// log-normal cumulative distribution function curve to the former method of linear interpolation
// scoring between the control points {average = 300 ms, poor = 750 ms, zero = 5000 ms} using the
// curve-fit tool at https://mycurvefit.com/ rounded to the nearest integer. See
// https://www.desmos.com/calculator/gcexiyesdi for an interactive visualization of the curve fit.
const WASTED_MS_P10 = 150;
const WASTED_MS_MEDIAN = 935;

/**
 * @typedef {object} ByteEfficiencyProduct
 * @property {Array<LH.Audit.ByteEfficiencyItem>} items
 * @property {Map<string, number>=} wastedBytesByUrl
 * @property {LH.Audit.Details.Opportunity['headings']} headings
 * @property {LH.IcuMessage} [displayValue]
 * @property {LH.IcuMessage} [explanation]
 * @property {Array<string | LH.IcuMessage>} [warnings]
 * @property {Array<string>} [sortedBy]
 */

/**
 * @overview Used as the base for all byte efficiency audits. Computes total bytes
 *    and estimated time saved. Subclass and override `audit_` to return results.
 */
class ByteEfficiencyAudit extends Audit {
  /**
   * Creates a score based on the wastedMs value using log-normal distribution scoring. A negative
   * wastedMs will be scored as 1, assuming time is not being wasted with respect to the opportunity
   * being measured.
   *
   * @param {number} wastedMs
   * @return {number}
   */
  static scoreForWastedMs(wastedMs) {
    return Audit.computeLogNormalScore(
      {p10: WASTED_MS_P10, median: WASTED_MS_MEDIAN},
      wastedMs
    );
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const gatherContext = artifacts.GatherContext;
    const devtoolsLog = artifacts.DevtoolsLog;
    const settings = context?.settings || {};
    const simulatorOptions = {
      devtoolsLog,
      settings,
    };
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const hasContentfulRecords = networkRecords.some(record => record.transferSize);

    // Requesting load simulator requires non-empty network records.
    // Timespans are not guaranteed to have any network activity.
    // There are no bytes to be saved if no bytes were downloaded, so mark N/A if empty.
    if (!hasContentfulRecords && gatherContext.gatherMode === 'timespan') {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    const metricComputationInput = Audit.makeMetricComputationDataInput(artifacts, context);

    const [result, simulator] = await Promise.all([
      this.audit_(artifacts, networkRecords, context),
      LoadSimulator.request(simulatorOptions, context),
    ]);

    return this.createAuditProduct(result, simulator, metricComputationInput, context);
  }

  /**
   * Computes the estimated effect of all the byte savings on the provided graph.
   *
   * @param {Array<LH.Audit.ByteEfficiencyItem>} results The array of byte savings results per resource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @param {{label?: string, providedWastedBytesByUrl?: Map<string, number>}=} options
   * @return {{savings: number, simulationBeforeChanges: LH.Gatherer.Simulation.Result, simulationAfterChanges: LH.Gatherer.Simulation.Result}}
   */
  static computeWasteWithGraph(results, graph, simulator, options) {
    options = Object.assign({label: ''}, options);
    const beforeLabel = `${this.meta.id}-${options.label}-before`;
    const afterLabel = `${this.meta.id}-${options.label}-after`;

    const simulationBeforeChanges = simulator.simulate(graph, {label: beforeLabel});

    const wastedBytesByUrl = options.providedWastedBytesByUrl || new Map();
    if (!options.providedWastedBytesByUrl) {
      for (const {url, wastedBytes} of results) {
        wastedBytesByUrl.set(url, (wastedBytesByUrl.get(url) || 0) + wastedBytes);
      }
    }

    // Update all the transfer sizes to reflect implementing our recommendations
    /** @type {Map<string, number>} */
    const originalTransferSizes = new Map();
    graph.traverse(node => {
      if (node.type !== 'network') return;
      const wastedBytes = wastedBytesByUrl.get(node.request.url);
      if (!wastedBytes) return;

      const original = node.request.transferSize;
      originalTransferSizes.set(node.request.requestId, original);

      node.request.transferSize = Math.max(original - wastedBytes, 0);
    });

    const simulationAfterChanges = simulator.simulate(graph, {label: afterLabel});

    // Restore the original transfer size after we've done our simulation
    graph.traverse(node => {
      if (node.type !== 'network') return;
      const originalTransferSize = originalTransferSizes.get(node.request.requestId);
      if (originalTransferSize === undefined) return;
      node.request.transferSize = originalTransferSize;
    });

    const savings = simulationBeforeChanges.timeInMs - simulationAfterChanges.timeInMs;

    return {
      // Round waste to nearest 10ms
      savings: Math.round(Math.max(savings, 0) / 10) * 10,
      simulationBeforeChanges,
      simulationAfterChanges,
    };
  }

  /**
   * @param {ByteEfficiencyProduct} result
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @param {LH.Artifacts.MetricComputationDataInput} metricComputationInput
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async createAuditProduct(result, simulator, metricComputationInput, context) {
    const results = result.items.sort((itemA, itemB) => itemB.wastedBytes - itemA.wastedBytes);

    const wastedBytes = results.reduce((sum, item) => sum + item.wastedBytes, 0);

    /** @type {LH.Audit.ProductMetricSavings} */
    const metricSavings = {
      FCP: 0,
      LCP: 0,
    };

    // `wastedMs` may be negative, if making the opportunity change could be detrimental.
    // This is useful information in the LHR and should be preserved.
    let wastedMs;
    if (metricComputationInput.gatherContext.gatherMode === 'navigation') {
      const optimisticFCPGraph = (await LanternFCP.request(metricComputationInput, context))
        .optimisticGraph;
      const optimisticLCPGraph = (await LanternLCP.request(metricComputationInput, context))
        .optimisticGraph;

      const {savings: fcpSavings} = this.computeWasteWithGraph(
        results,
        optimisticFCPGraph,
        simulator,
        {providedWastedBytesByUrl: result.wastedBytesByUrl, label: 'fcp'}
      );
      // Note: LCP's optimistic graph sometimes unexpectedly yields higher savings than the pessimistic graph.
      const {savings: lcpGraphSavings} = this.computeWasteWithGraph(
        results,
        optimisticLCPGraph,
        simulator,
        {providedWastedBytesByUrl: result.wastedBytesByUrl, label: 'lcp'}
      );


      // The LCP graph can underestimate the LCP savings if there is potential savings on the LCP record itself.
      let lcpRecordSavings = 0;
      const lcpRecord = await LCPImageRecord.request(metricComputationInput, context);
      if (lcpRecord) {
        const lcpResult = results.find(result => result.url === lcpRecord.url);
        if (lcpResult) {
          lcpRecordSavings = simulator.computeWastedMsFromWastedBytes(lcpResult.wastedBytes);
        }
      }

      metricSavings.FCP = fcpSavings;
      metricSavings.LCP = Math.max(lcpGraphSavings, lcpRecordSavings);
      wastedMs = metricSavings.LCP;
    } else {
      wastedMs = simulator.computeWastedMsFromWastedBytes(wastedBytes);
    }

    let displayValue = result.displayValue || '';
    if (typeof result.displayValue === 'undefined' && wastedBytes) {
      displayValue = str_(i18n.UIStrings.displayValueByteSavings, {wastedBytes});
    }

    const sortedBy = result.sortedBy || ['wastedBytes'];
    const details = Audit.makeOpportunityDetails(result.headings, results,
      {overallSavingsMs: wastedMs, overallSavingsBytes: wastedBytes, sortedBy});

    // TODO: Remove from debug data once `metricSavings` is added to the LHR.
    // For now, add it to debug data for visibility.
    details.debugData = {
      type: 'debugdata',
      metricSavings,
    };

    return {
      explanation: result.explanation,
      warnings: result.warnings,
      displayValue,
      numericValue: wastedMs,
      numericUnit: 'millisecond',
      score: results.length ? 0 : 1,
      details,
      metricSavings,
    };
  }

  /* eslint-disable no-unused-vars */

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {ByteEfficiencyProduct|Promise<ByteEfficiencyProduct>}
   */
  static audit_(artifacts, networkRecords, context) {
    throw new Error('audit_ unimplemented');
  }

  /* eslint-enable no-unused-vars */
}

export {ByteEfficiencyAudit};
