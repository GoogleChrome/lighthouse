/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/RenderBlocking.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/RenderBlocking.js', UIStrings);

class RenderBlockingInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'render-blocking-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['traces', 'TraceElements'],
      replacesAudits: ['render-blocking-resources'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    // TODO: show UIStrings.noRenderBlocking if nothing was blocking?
    return adaptInsightToAuditProduct(artifacts, context, 'RenderBlocking', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
        {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize)},
        {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = insight.renderBlockingRequests.map(request => ({
        url: request.args.data.url,
        totalBytes: request.args.data.encodedDataLength,
        wastedMs: insight.requestIdToWastedMs?.get(request.args.data.requestId),
      }));
      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default RenderBlockingInsight;
