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
      requiredArtifacts: ['Trace', 'SourceMaps'],
      replacesAudits: ['uses-long-cache-ttl'],
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
        {key: 'url', valueType: 'url', label: str_(UIStrings.requestColumn)},
        {key: 'cacheLifetimeMs', valueType: 'ms', label: str_(UIStrings.cacheTTL), displayUnit: 'duration'},
        {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize), displayUnit: 'kb', granularity: 1},
        /* eslint-enable max-len */
      ];
      // TODO: this should be the sorting in the model (instead it sorts by transfer size...)
      const values = insight.requests.sort((a, b) => b.wastedBytes - a.wastedBytes);
      /** @type {LH.Audit.Details.Table['items']} */
      const items = values.map(value => ({
        url: value.request.args.data.url,
        cacheLifetimeMs: value.ttl * 1000,
        wastedBytes: value.wastedBytes,
      }));
      return Audit.makeTableDetails(headings, items, {
        sortedBy: ['wastedBytes'],
        skipSumming: ['cacheLifetimeMs'],
      });
    });
  }
}

export default CacheInsight;
