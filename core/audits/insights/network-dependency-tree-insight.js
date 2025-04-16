/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/NetworkDependencyTree.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

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
      requiredArtifacts: ['Trace', 'SourceMaps'],
      replacesAudits: ['critical-request-chains'],
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
      const chains = this.traceEngineNodesToDetailsNodes(insight.rootNodes);

      return {
        type: 'network-tree',
        chains,
        longestChain: {
          duration: Math.round(insight.maxTime / 1000),
        },
      };
    });
  }
}

export default NetworkDependencyTreeInsight;
