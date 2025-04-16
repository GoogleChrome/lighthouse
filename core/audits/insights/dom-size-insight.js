/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/DOMSize.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/DOMSize.js', UIStrings);

class DOMSizeInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'dom-size-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
      replacesAudits: ['dom-size'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'DOMSize', (insight) => {
      if (!insight.maxDOMStats?.args.data.maxChildren || !insight.maxDOMStats?.args.data.maxDepth) {
        return;
      }

      const {totalElements, maxChildren, maxDepth} = insight.maxDOMStats.args.data;

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'statistic', valueType: 'text', label: str_(UIStrings.statistic)},
        {key: 'node', valueType: 'node', label: str_(UIStrings.element)},
        {key: 'value', valueType: 'numeric', label: str_(UIStrings.value)},
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = [
        {
          statistic: str_(UIStrings.totalElements),
          value: {
            type: 'numeric',
            granularity: 1,
            value: totalElements,
          },
        },
        {
          statistic: str_(UIStrings.maxChildren),
          node: makeNodeItemForNodeId(artifacts.TraceElements, maxChildren.nodeId),
          value: {
            type: 'numeric',
            granularity: 1,
            value: maxChildren.numChildren,
          },
        },
        {
          statistic: str_(UIStrings.maxDOMDepth),
          node: makeNodeItemForNodeId(artifacts.TraceElements, maxDepth.nodeId),
          value: {
            type: 'numeric',
            granularity: 1,
            value: maxDepth.depth,
          },
        },
      ];
      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default DOMSizeInsight;
