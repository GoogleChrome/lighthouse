/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/INPBreakdown.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/INPBreakdown.js', UIStrings);

class INPBreakdownInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'inp-breakdown-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
      replacesAudits: ['work-during-interaction'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'INPBreakdown', (insight) => {
      const event = insight.longestInteractionEvent;
      if (!event) {
        // TODO: show UIStrings.noInteractions?
        return;
      }

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'label', valueType: 'text', label: str_(UIStrings.subpart)},
        {key: 'duration', valueType: 'ms', label: str_(i18n.UIStrings.columnDuration)},
      ];

      /** @type {LH.Audit.Details.Table['items']} */
      const items = [
        /* eslint-disable max-len */
        {subpart: 'inputDelay', label: str_(UIStrings.inputDelay), duration: event.inputDelay / 1000},
        {subpart: 'processingDuration', label: str_(UIStrings.processingDuration), duration: event.mainThreadHandling / 1000},
        {subpart: 'presentationDelay', label: str_(UIStrings.presentationDelay), duration: event.presentationDelay / 1000},
        /* eslint-enable max-len */
      ];

      return Audit.makeListDetails([
        Audit.makeTableDetails(headings, items),
        makeNodeItemForNodeId(artifacts.TraceElements, event.args.data.beginEvent.args.data.nodeId),
      ].filter(table => !!table));
    });
  }
}

export default INPBreakdownInsight;
