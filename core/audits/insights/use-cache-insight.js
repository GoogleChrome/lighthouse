/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/UseCache.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/UseCache.js', UIStrings);

class UseCacheInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'use-cache-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['traces', 'SourceMaps'],
      replacesAudits: ['uses-long-cache-ttl'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'UseCache', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', label: str_(UIStrings.requestColumn)},
        {key: 'cacheLifetimeMs', valueType: 'ms', label: str_(UIStrings.cacheTTL), displayUnit: 'duration'},
        {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize), displayUnit: 'kb', granularity: 1},
        /* eslint-enable max-len */
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = insight.requests.map(request => ({
        url: request.request.args.data.url,
        cacheLifetimeMs: request.ttl * 1000,
        totalBytes: request.request.args.data.encodedDataLength,
      }));
      return Audit.makeTableDetails(headings, items, {
        sortedBy: ['totalBytes'],
        skipSumming: ['cacheLifetimeMs'],
      });
    });
  }
}

export default UseCacheInsight;
