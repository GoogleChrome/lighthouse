/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/Cache.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/Cache.js', UIStrings);

class CacheInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'cache-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['traces', 'SourceMaps'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'Cache', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
        {key: 'ttl', valueType: 'ms', displayUnit: 'duration', label: str_(UIStrings.cacheTTL)},
        /* eslint-enable max-len */
      ];
      // TODO: this should be sorting in the model.
      const values = insight.requests.sort((a, b) =>
        b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);
      /** @type {LH.Audit.Details.Table['items']} */
      const items = values.map(v => ({url: v.request.args.data.url, ttl: v.ttl * 1000}));
      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default CacheInsight;
