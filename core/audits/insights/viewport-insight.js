/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/Viewport.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/Viewport.js', UIStrings);

class ViewportInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'viewport-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
      replacesAudits: ['viewport'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'Viewport', (insight) => {
      const nodeId = insight.viewportEvent?.args.data.node_id;

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'node', valueType: 'node', label: ''},
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = [
        {node: makeNodeItemForNodeId(artifacts.TraceElements, nodeId)},
      ];
      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default ViewportInsight;
