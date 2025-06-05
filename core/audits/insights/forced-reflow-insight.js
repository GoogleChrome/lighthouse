/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/ForcedReflow.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/ForcedReflow.js', UIStrings);

class ForcedReflowInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'forced-reflow-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
    };
  }

  /**
   * @param {import('@paulirish/trace_engine/models/trace/insights/ForcedReflow.js').ForcedReflowAggregatedData} topLevelFunctionCallData
   * @returns {LH.Audit.Details.Table}
   */
  static makeTopFunctionTable(topLevelFunctionCallData) {
    const {topLevelFunctionCall} = topLevelFunctionCallData;
    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      // eslint-disable-next-line max-len
      {key: 'source', valueType: 'source-location', label: str_(UIStrings.topTimeConsumingFunctionCall)},
      {key: 'reflowTime', valueType: 'ms', granularity: 1, label: str_(UIStrings.totalReflowTime)},
    ];
    /** @type {LH.Audit.Details.Table['items']} */
    const items = [
      {
        source: Audit.makeSourceLocation(
          topLevelFunctionCall.url,
          topLevelFunctionCall.lineNumber,
          topLevelFunctionCall.columnNumber
        ),
        reflowTime: topLevelFunctionCallData.totalReflowTime / 1000,
      },
    ];
    return Audit.makeTableDetails(headings, items);
  }

  /**
   * @param {import('@paulirish/trace_engine/models/trace/insights/ForcedReflow.js').ForcedReflowInsightModel} insight
   * @returns {LH.Audit.Details.Table}
   */
  static makeBottomUpTable(insight) {
    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', valueType: 'source-location', label: str_(i18n.UIStrings.columnSource)},
      {key: 'reflowTime', valueType: 'ms', granularity: 1, label: str_(UIStrings.totalReflowTime)},
    ];
    /** @type {LH.Audit.Details.Table['items']} */
    const items = insight.aggregatedBottomUpData.map((data) => {
      const {bottomUpData, totalTime} = data;

      const source = bottomUpData ? Audit.makeSourceLocation(
        bottomUpData.url,
        bottomUpData.lineNumber,
        bottomUpData.columnNumber
      ) : {
        type: /** @type {const} */ ('text'),
        value: str_(UIStrings.unattributed),
      };

      return {
        source,
        reflowTime: totalTime / 1000,
      };
    });
    return Audit.makeTableDetails(headings, items);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'ForcedReflow', (insight) => {
      const list = [this.makeBottomUpTable(insight)];
      if (insight.topLevelFunctionCallData) {
        list.unshift(this.makeTopFunctionTable(insight.topLevelFunctionCallData));
      }
      return Audit.makeListDetails(list);
    });
  }
}

export default ForcedReflowInsight;
