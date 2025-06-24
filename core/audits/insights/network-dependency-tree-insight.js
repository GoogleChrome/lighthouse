/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings, TOO_MANY_PRECONNECTS_THRESHOLD} from '@paulirish/trace_engine/models/trace/insights/NetworkDependencyTree.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/NetworkDependencyTree.js', UIStrings);

class NetworkDependencyTreeInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'network-dependency-tree-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 1,
      requiredArtifacts: ['Trace', 'SourceMaps', 'TraceElements'],
      replacesAudits: ['critical-request-chains', 'uses-rel-preconnect'],
    };
  }

  /**
   * @param {import('@paulirish/trace_engine').Insights.Models.NetworkDependencyTree.CriticalRequestNode[]} nodes
   * @return {LH.Audit.Details.NetworkNode}
   */
  static traceEngineNodesToDetailsNodes(nodes) {
    /** @type {LH.Audit.Details.NetworkNode} */
    const simpleRequestNode = {};

    for (const node of nodes) {
      const {request} = node;

      simpleRequestNode[request.args.data.requestId] = {
        url: request.args.data.url,
        navStartToEndTime: Math.round(node.timeFromInitialRequest / 1000),
        transferSize: request.args.data.encodedDataLength,
        isLongest: node.isLongest,
        children: this.traceEngineNodesToDetailsNodes(node.children),
      };
    }

    return simpleRequestNode;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'NetworkDependencyTree', (insight) => {
      const list = [];
      let sectionDetails;

      sectionDetails = /** @type {LH.Audit.Details.NetworkTree} */({
        type: 'network-tree',
        chains: this.traceEngineNodesToDetailsNodes(insight.rootNodes),
        longestChain: {
          duration: Math.round(insight.maxTime / 1000),
        },
      });
      list.push(Audit.makeListDetailSectionItem(sectionDetails));

      // Preconnected origins table.
      if (insight.preconnectedOrigins.length) {
        /** @type {LH.Audit.Details.Table['headings']} */
        const headings = [
          /* eslint-disable max-len */
          {key: 'origin', valueType: 'text', subItemsHeading: {key: 'warning'}, label: str_(UIStrings.columnOrigin)},
          {key: 'source', valueType: 'node', label: str_(UIStrings.columnSource)},
          /* eslint-enable max-len */
        ];

        /** @type {LH.Audit.Details.Table['items']} */
        const items = insight.preconnectedOrigins.map(c => {
          const warnings = [];
          if (c.unused) {
            warnings.push(str_(UIStrings.unusedWarning));
          }
          if (c.crossorigin) {
            warnings.push(str_(UIStrings.crossoriginWarning));
          }
          /** @type {LH.Audit.Details.TableSubItems} */
          const subItems = {
            type: 'subitems',
            items: warnings.map(warning => ({warning})),
          };
          return {
            origin: c.url,
            source: c.source === 'DOM' ?
              makeNodeItemForNodeId(artifacts.TraceElements, c.node_id) :
              {type: 'text', value: c.headerText},
            subItems,
          };
        });

        sectionDetails = Audit.makeTableDetails(headings, items);
      } else {
        sectionDetails = /** @type {LH.Audit.Details.TextValue} */ (
          {type: 'text', value: str_(UIStrings.noPreconnectOrigins)});
      }

      list.push(Audit.makeListDetailSectionItem(
        sectionDetails,
        str_(UIStrings.preconnectOriginsTableTitle),
        str_(UIStrings.preconnectOriginsTableDescription)));

      // Estimated savings table.
      if (insight.preconnectCandidates.length) {
        /** @type {LH.Audit.Details.Table['headings']} */
        const headings = [
          {key: 'origin', valueType: 'text', label: str_(UIStrings.columnOrigin)},
          {key: 'wastedMs', valueType: 'ms', label: str_(UIStrings.columnWastedMs)},
        ];

        /** @type {LH.Audit.Details.Table['items']} */
        const items = insight.preconnectCandidates.map(c => {
          return {origin: c.origin, wastedMs: c.wastedMs};
        });

        sectionDetails = Audit.makeTableDetails(headings, items);
      } else {
        sectionDetails = /** @type {LH.Audit.Details.TextValue} */ (
          {type: 'text', value: str_(UIStrings.noPreconnectCandidates)});
      }

      list.push(Audit.makeListDetailSectionItem(
        sectionDetails,
        str_(UIStrings.estSavingTableTitle),
        str_(UIStrings.estSavingTableDescription)));

      const warnings = [];
      if (insight.preconnectedOrigins.length > TOO_MANY_PRECONNECTS_THRESHOLD) {
        warnings.push(str_(UIStrings.tooManyPreconnectLinksWarning));
      }

      return {details: Audit.makeListDetails(list), warnings};
    });
  }
}

export default NetworkDependencyTreeInsight;
