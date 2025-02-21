/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/ThirdParties.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/ThirdParties.js', UIStrings);

/**
 * @typedef URLSummary
 * @property {number} transferSize
 * @property {number} mainThreadTime
 * @property {string | LH.IcuMessage} url
 */

class ThirdPartiesInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'third-parties-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['traces', 'TraceElements'],
      replacesAudits: ['third-party-summary'],
    };
  }

  /**
   * @param {LH.Artifacts.Entity} entity
   * @param {import('@paulirish/trace_engine/models/trace/insights/ThirdParties.js').ThirdPartiesInsightModel} insight
   * @return {Array<URLSummary>}
   */
  static makeSubItems(entity, insight) {
    const urls = [...insight.urlsByEntity.get(entity) ?? []];
    return urls
      .map(url => ({
        url,
        mainThreadTime: 0,
        transferSize: 0,
        ...insight.summaryByUrl.get(url),
      }))
      // Sort by main thread time first, then transfer size to break ties.
      .sort((a, b) => (b.mainThreadTime - a.mainThreadTime) || (b.transferSize - a.transferSize));
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'ThirdParties', (insight) => {
      const thirdPartyEntities = [...insight.summaryByEntity.entries()]
        .filter((([entity, _]) => entity !== insight.firstPartyEntity));

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        /* eslint-disable max-len */
        {key: 'entity', valueType: 'text', label: str_(UIStrings.columnThirdParty), subItemsHeading: {key: 'url', valueType: 'url'}},
        {key: 'transferSize', granularity: 1, valueType: 'bytes', label: str_(UIStrings.columnTransferSize), subItemsHeading: {key: 'transferSize'}},
        {key: 'mainThreadTime', granularity: 1, valueType: 'ms', label: str_(UIStrings.columnMainThreadTime), subItemsHeading: {key: 'mainThreadTime'}},
        /* eslint-enable max-len */
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = thirdPartyEntities.map(([entity, summary]) => ({
        entity: entity.name,
        transferSize: summary.transferSize,
        mainThreadTime: summary.mainThreadTime,
        subItems: {
          type: /** @type {const} */ ('subitems'),
          items: ThirdPartiesInsight.makeSubItems(entity, insight),
        },
      }));
      return Audit.makeTableDetails(headings, items, {isEntityGrouped: true});
    });
  }
}

export default ThirdPartiesInsight;
