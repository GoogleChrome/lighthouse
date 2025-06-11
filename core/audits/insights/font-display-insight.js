/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/FontDisplay.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/FontDisplay.js', UIStrings);

class FontDisplayInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'font-display-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
      replacesAudits: ['font-display'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'FontDisplay', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
        {key: 'wastedMs', valueType: 'ms', label: str_(i18n.UIStrings.columnWastedMs)},
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = insight.fonts.map(font => ({
        url: font.request.args.data.url,
        wastedMs: font.wastedTime,
      }));
      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default FontDisplayInsight;
