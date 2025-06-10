/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/DuplicatedJavaScript.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/DuplicatedJavaScript.js', UIStrings);

/** @typedef {LH.Audit.Details.TableItem & {source: string, subItems: {type: 'subitems', items: SubItem[]}}} Item */
/** @typedef {{url: string, sourceTransferBytes: number|LH.Audit.Details.TextValue}} SubItem */

class DuplicatedJavaScriptInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'duplicated-javascript-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 2,
      requiredArtifacts: ['Trace', 'SourceMaps'],
      replacesAudits: ['duplicated-javascript'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'DuplicatedJavaScript', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        /* eslint-disable max-len */
        {key: 'source', valueType: 'code', subItemsHeading: {key: 'url', valueType: 'url'}, label: str_(i18n.UIStrings.columnSource)},
        {key: 'wastedBytes', valueType: 'bytes', subItemsHeading: {key: 'sourceTransferBytes'}, granularity: 10, label: str_(UIStrings.columnDuplicatedBytes)},
        /* eslint-enable max-len */
      ];

      const entries = [...insight.duplicationGroupedByNodeModules.entries()].slice(0, 10);

      /** @type {Item[]} */
      const items = entries.map(([source, data]) => {
        /** @type {Item} */
        const item = {
          source,
          wastedBytes: data.estimatedDuplicateBytes,
          subItems: {
            type: 'subitems',
            items: [],
          },
        };

        for (const [index, {script, attributedSize}] of data.duplicates.entries()) {
          /** @type {SubItem} */
          const subItem = {
            url: script.url ?? '',
            sourceTransferBytes: index === 0 ? {type: 'text', value: '--'} : attributedSize,
          };
          item.subItems.items.push(subItem);
        }

        return item;
      });

      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default DuplicatedJavaScriptInsight;
