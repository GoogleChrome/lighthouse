/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/LCPBreakdown.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/LCPBreakdown.js', UIStrings);

class LCPBreakdownInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'lcp-breakdown-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
      replacesAudits: ['largest-contentful-paint-element'],
    };
  }

  /**
   * @param {Required<import('@paulirish/trace_engine/models/trace/insights/LCPBreakdown.js').LCPBreakdownInsightModel>['subparts']} subparts
   * @return {LH.Audit.Details.Table}
   */
  static makeSubpartsTable(subparts) {
    const {ttfb, loadDelay, loadDuration, renderDelay} = subparts;

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'label', valueType: 'text', label: str_(UIStrings.subpart)},
      {key: 'duration', valueType: 'ms', label: str_(i18n.UIStrings.columnDuration)},
    ];

    /** @type {LH.Audit.Details.Table['items']} */
    let items = [
      /* eslint-disable max-len */
      {subpart: 'timeToFirstByte', label: str_(UIStrings.timeToFirstByte), duration: ttfb.range / 1000},
      {subpart: 'resourceLoadDelay', label: str_(UIStrings.resourceLoadDelay), duration: (loadDelay?.range ?? 0) / 1000},
      {subpart: 'resourceLoadDuration', label: str_(UIStrings.resourceLoadDuration), duration: (loadDuration?.range ?? 0) / 1000},
      {subpart: 'elementRenderDelay', label: str_(UIStrings.elementRenderDelay), duration: renderDelay.range / 1000},
      /* eslint-enable max-len */
    ];

    if (loadDelay === undefined) {
      items = items.filter(item => item.subpart !== 'resourceLoadDelay');
    }
    if (loadDuration === undefined) {
      items = items.filter(item => item.subpart !== 'resourceLoadDuration');
    }

    return Audit.makeTableDetails(headings, items);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'LCPBreakdown', (insight) => {
      if (!insight.subparts) {
        return;
      }

      return Audit.makeListDetails([
        LCPBreakdownInsight.makeSubpartsTable(insight.subparts),
        makeNodeItemForNodeId(artifacts.TraceElements, insight.lcpEvent?.args.data?.nodeId),
      ].filter(table => table !== undefined));
    });
  }
}

export default LCPBreakdownInsight;
