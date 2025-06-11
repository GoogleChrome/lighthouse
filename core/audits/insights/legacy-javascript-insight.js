/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/LegacyJavaScript.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {JSBundles} from '../../computed/js-bundles.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/LegacyJavaScript.js', UIStrings);

/** @typedef {LH.Audit.Details.TableItem & {subItems: {type: 'subitems', items: SubItem[]}}} Item */
/** @typedef {{signal: string, location: LH.Audit.Details.SourceLocationValue}} SubItem */

class LegacyJavaScriptInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'legacy-javascript-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 2,
      requiredArtifacts: ['Trace', 'Scripts', 'SourceMaps'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const bundles = await JSBundles.request(artifacts, context);

    return adaptInsightToAuditProduct(artifacts, context, 'LegacyJavaScript', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', subItemsHeading: {key: 'location', valueType: 'source-location'}, label: str_(i18n.UIStrings.columnURL)},
        {key: null, valueType: 'code', subItemsHeading: {key: 'signal'}, label: ''},
        {key: 'wastedBytes', valueType: 'bytes', label: str_(UIStrings.columnWastedBytes)},
        /* eslint-enable max-len */
      ];

      /** @type {Item[]} */
      const items = [];

      for (const [script, result] of insight.legacyJavaScriptResults) {
        const bundle = bundles.find(bundle => bundle.script.scriptId === script.scriptId);

        /** @type {Item} */
        const item = {
          url: script.url ?? '',
          wastedBytes: result.estimatedByteSavings,
          subItems: {
            type: 'subitems',
            items: [],
          },
        };

        for (const match of result.matches) {
          const {name, line, column} = match;
          /** @type {SubItem} */
          const subItem = {
            signal: name,
            location: Audit.makeSourceLocation(script.url ?? '', line, column, bundle),
          };
          item.subItems.items.push(subItem);
        }

        items.push(item);
      }

      // TODO: add this warning to the insight.
      // for (const bundle of bundles) {
      //   if (classifiedEntities.isFirstParty(bundle.script.url)) {
      //     if (bundle.rawMap.sources.some(s => s.match(/node_modules\/core-js\/modules\/es[67]/))) {
      //       if (!insight.warnings) {
      //         insight.warnings = [];
      //       }

      //       insight.warnings.push(str_(UIStrings.detectedCoreJs2Warning));
      //       break;
      //     }
      //   }
      // }

      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default LegacyJavaScriptInsight;
